import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { encode as base64Encode, decode as base64Decode } from "https://deno.land/std@0.168.0/encoding/base64.ts";
import { crypto } from "https://deno.land/std@0.168.0/crypto/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Função para extrair chave privada e certificado do PFX
async function extractFromPfx(pfxBase64: string, password: string): Promise<{
  privateKey: CryptoKey;
  certificate: string;
  certInfo: { subject: string; issuer: string; validFrom: Date; validTo: Date };
}> {
  // Decodificar PFX de base64
  const pfxData = base64Decode(pfxBase64);
  
  // Usar forge via CDN para processar PFX (PKCS#12)
  // Como Deno não tem suporte nativo a PFX, vamos usar uma abordagem alternativa
  // Importar forge dinamicamente
  const forge = await import("https://esm.sh/node-forge@1.3.1");
  
  // Converter Uint8Array para string binária
  const pfxBinary = String.fromCharCode(...pfxData);
  
  // Decodificar PFX
  const asn1 = forge.asn1.fromDer(pfxBinary);
  const p12 = forge.pkcs12.pkcs12FromAsn1(asn1, password);
  
  // Extrair chave privada
  const keyBags = p12.getBags({ bagType: forge.pki.oids.pkcs8ShroudedKeyBag });
  const keyBag = keyBags[forge.pki.oids.pkcs8ShroudedKeyBag]?.[0];
  
  if (!keyBag || !keyBag.key) {
    throw new Error("Chave privada não encontrada no certificado");
  }
  
  // Extrair certificado
  const certBags = p12.getBags({ bagType: forge.pki.oids.certBag });
  const certBag = certBags[forge.pki.oids.certBag]?.[0];
  
  if (!certBag || !certBag.cert) {
    throw new Error("Certificado não encontrado");
  }
  
  const cert = certBag.cert;
  
  // Converter chave privada para formato PEM
  const privateKeyPem = forge.pki.privateKeyToPem(keyBag.key);
  
  // Converter certificado para formato PEM e depois para DER base64
  const certDer = forge.asn1.toDer(forge.pki.certificateToAsn1(cert)).getBytes();
  const certBase64 = forge.util.encode64(certDer);
  
  // Importar chave privada para Web Crypto API
  const privateKeyDer = forge.asn1.toDer(forge.pki.privateKeyToAsn1(keyBag.key)).getBytes();
  const privateKeyBytes = new Uint8Array(privateKeyDer.length);
  for (let i = 0; i < privateKeyDer.length; i++) {
    privateKeyBytes[i] = privateKeyDer.charCodeAt(i);
  }
  
  const privateKey = await crypto.subtle.importKey(
    "pkcs8",
    privateKeyBytes,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-1" },
    false,
    ["sign"]
  );
  
  // Extrair informações do certificado
  const certInfo = {
    subject: cert.subject.getField("CN")?.value || "",
    issuer: cert.issuer.getField("CN")?.value || "",
    validFrom: cert.validity.notBefore,
    validTo: cert.validity.notAfter,
  };
  
  return { privateKey, certificate: certBase64, certInfo };
}

// Função para calcular digest SHA-1
async function sha1Digest(data: string): Promise<string> {
  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(data);
  const hashBuffer = await crypto.subtle.digest("SHA-1", dataBuffer);
  return base64Encode(new Uint8Array(hashBuffer));
}

// Função para canonicalizar XML (C14N)
function canonicalize(xml: string): string {
  // Implementação simplificada de C14N
  // Remove declaração XML, normaliza espaços em branco, ordena atributos
  let canonical = xml
    .replace(/<\?xml[^?]*\?>/gi, "")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/>\s+</g, "><")
    .trim();
  
  return canonical;
}

// Função para assinar XML
async function signXml(
  xml: string,
  privateKey: CryptoKey,
  certificate: string,
  tagToSign: string = "infNFe"
): Promise<string> {
  // Encontrar o elemento a ser assinado
  const tagRegex = new RegExp(`<${tagToSign}[^>]*Id="([^"]+)"[^>]*>`, "i");
  const match = xml.match(tagRegex);
  
  if (!match) {
    throw new Error(`Tag ${tagToSign} com atributo Id não encontrada`);
  }
  
  const referenceId = match[1];
  
  // Extrair conteúdo do elemento para calcular digest
  const elementRegex = new RegExp(`(<${tagToSign}[^>]*>.*?</${tagToSign}>)`, "is");
  const elementMatch = xml.match(elementRegex);
  
  if (!elementMatch) {
    throw new Error(`Elemento ${tagToSign} não encontrado`);
  }
  
  const elementContent = canonicalize(elementMatch[1]);
  const digestValue = await sha1Digest(elementContent);
  
  // Montar SignedInfo
  const signedInfo = `<SignedInfo xmlns="http://www.w3.org/2000/09/xmldsig#"><CanonicalizationMethod Algorithm="http://www.w3.org/TR/2001/REC-xml-c14n-20010315"/><SignatureMethod Algorithm="http://www.w3.org/2000/09/xmldsig#rsa-sha1"/><Reference URI="#${referenceId}"><Transforms><Transform Algorithm="http://www.w3.org/2000/09/xmldsig#enveloped-signature"/><Transform Algorithm="http://www.w3.org/TR/2001/REC-xml-c14n-20010315"/></Transforms><DigestMethod Algorithm="http://www.w3.org/2000/09/xmldsig#sha1"/><DigestValue>${digestValue}</DigestValue></Reference></SignedInfo>`;
  
  // Canonicalizar SignedInfo para assinatura
  const signedInfoCanonical = canonicalize(signedInfo);
  
  // Assinar com chave privada
  const encoder = new TextEncoder();
  const signedInfoBytes = encoder.encode(signedInfoCanonical);
  const signatureBytes = await crypto.subtle.sign(
    { name: "RSASSA-PKCS1-v1_5" },
    privateKey,
    signedInfoBytes
  );
  const signatureValue = base64Encode(new Uint8Array(signatureBytes));
  
  // Montar elemento Signature completo
  const signature = `<Signature xmlns="http://www.w3.org/2000/09/xmldsig#">${signedInfo}<SignatureValue>${signatureValue}</SignatureValue><KeyInfo><X509Data><X509Certificate>${certificate}</X509Certificate></X509Data></KeyInfo></Signature>`;
  
  // Inserir assinatura no XML (antes do fechamento do elemento pai)
  const closingTag = `</${tagToSign}>`;
  const signedXml = xml.replace(closingTag, `${closingTag}${signature}`);
  
  return signedXml;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, xml, pfxBase64, password, tagToSign } = await req.json();

    switch (action) {
      case "extract_cert_info": {
        // Apenas extrair informações do certificado
        const { certInfo } = await extractFromPfx(pfxBase64, password);
        return new Response(JSON.stringify({
          success: true,
          certInfo
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }

      case "sign": {
        // Assinar XML
        if (!xml) {
          throw new Error("XML não fornecido");
        }
        
        const { privateKey, certificate } = await extractFromPfx(pfxBase64, password);
        const signedXml = await signXml(xml, privateKey, certificate, tagToSign || "infNFe");
        
        return new Response(JSON.stringify({
          success: true,
          signedXml
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }

      case "digest": {
        // Calcular digest de um XML
        const canonical = canonicalize(xml);
        const digest = await sha1Digest(canonical);
        
        return new Response(JSON.stringify({
          success: true,
          digest,
          canonical
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }

      default:
        throw new Error("Ação não reconhecida");
    }
  } catch (error) {
    console.error("Erro no xml-signer:", error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : "Erro desconhecido"
    }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});
