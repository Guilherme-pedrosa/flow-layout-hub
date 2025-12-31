#!/usr/bin/env python3
"""
Invoice/Boleto Extractor using Docling
Extrai dados de faturas e boletos em PDF e cruza com lançamentos financeiros
"""

import re
import json
from datetime import datetime
from typing import Optional, Dict, List, Any
from dataclasses import dataclass, asdict
from docling.document_converter import DocumentConverter


@dataclass
class ExtractedInvoiceData:
    """Dados extraídos de uma fatura/boleto"""
    # Dados do documento
    document_type: str  # 'boleto', 'fatura', 'nota_fiscal', 'outros'
    raw_text: str
    
    # Dados financeiros
    valor_total: Optional[float] = None
    data_vencimento: Optional[str] = None  # YYYY-MM-DD
    data_emissao: Optional[str] = None  # YYYY-MM-DD
    
    # Dados do beneficiário/fornecedor
    beneficiario_nome: Optional[str] = None
    beneficiario_cnpj: Optional[str] = None
    
    # Dados do pagador
    pagador_nome: Optional[str] = None
    pagador_cnpj: Optional[str] = None
    
    # Dados específicos de boleto
    codigo_barras: Optional[str] = None
    linha_digitavel: Optional[str] = None
    nosso_numero: Optional[str] = None
    numero_documento: Optional[str] = None
    
    # Dados específicos de fatura
    numero_fatura: Optional[str] = None
    parcela: Optional[str] = None  # "1/3", "2/3", etc.
    
    # Metadados
    confidence_score: float = 0.0
    extraction_errors: List[str] = None
    
    def __post_init__(self):
        if self.extraction_errors is None:
            self.extraction_errors = []


class InvoiceExtractor:
    """Extrai dados de faturas e boletos usando Docling"""
    
    def __init__(self):
        self.converter = DocumentConverter()
        
        # Padrões de regex para extração
        self.patterns = {
            # Valores monetários
            'valor': [
                r'(?:valor|total|quantia|r\$)\s*[:=]?\s*R?\$?\s*([\d.,]+)',
                r'R\$\s*([\d.,]+)',
                r'(\d{1,3}(?:\.\d{3})*,\d{2})',
            ],
            
            # Datas
            'data': [
                r'(\d{2}/\d{2}/\d{4})',
                r'(\d{2}-\d{2}-\d{4})',
                r'(\d{4}-\d{2}-\d{2})',
            ],
            
            # CNPJ
            'cnpj': [
                r'(\d{2}\.?\d{3}\.?\d{3}/?\d{4}-?\d{2})',
            ],
            
            # CPF
            'cpf': [
                r'(\d{3}\.?\d{3}\.?\d{3}-?\d{2})',
            ],
            
            # Código de barras (47 ou 48 dígitos)
            'codigo_barras': [
                r'(\d{5}\.?\d{5}\s*\d{5}\.?\d{6}\s*\d{5}\.?\d{6}\s*\d\s*\d{14})',
                r'(\d{47,48})',
            ],
            
            # Linha digitável
            'linha_digitavel': [
                r'(\d{5}\.\d{5}\s+\d{5}\.\d{6}\s+\d{5}\.\d{6}\s+\d\s+\d{14})',
            ],
            
            # Nosso número
            'nosso_numero': [
                r'(?:nosso\s*n[úu]mero|n\.?\s*documento)\s*[:=]?\s*(\d+[\d\-\.\/]*)',
            ],
            
            # Número do documento/fatura
            'numero_documento': [
                r'(?:n[úu]mero|nf|nota|fatura|documento)\s*[:=]?\s*(\d+)',
                r'(?:doc|ref)\s*[:=]?\s*(\d+)',
            ],
        }
    
    def extract_from_pdf(self, pdf_path: str) -> ExtractedInvoiceData:
        """Extrai dados de um arquivo PDF"""
        try:
            # Converter PDF para texto usando Docling
            result = self.converter.convert(pdf_path)
            text = result.document.export_to_markdown()
            
            # Extrair dados do texto
            return self._extract_from_text(text)
            
        except Exception as e:
            return ExtractedInvoiceData(
                document_type='erro',
                raw_text='',
                extraction_errors=[f'Erro ao processar PDF: {str(e)}']
            )
    
    def extract_from_text(self, text: str) -> ExtractedInvoiceData:
        """Extrai dados de um texto já convertido"""
        return self._extract_from_text(text)
    
    def _extract_from_text(self, text: str) -> ExtractedInvoiceData:
        """Lógica principal de extração"""
        errors = []
        text_lower = text.lower()
        
        # Detectar tipo de documento
        doc_type = self._detect_document_type(text_lower)
        
        # Extrair valor
        valor = self._extract_valor(text)
        if valor is None:
            errors.append('Valor não encontrado')
        
        # Extrair datas
        datas = self._extract_datas(text, text_lower)
        
        # Extrair CNPJs
        cnpjs = self._extract_cnpjs(text)
        
        # Extrair código de barras
        codigo_barras = self._extract_pattern(text, 'codigo_barras')
        linha_digitavel = self._extract_pattern(text, 'linha_digitavel')
        
        # Extrair números de documento
        nosso_numero = self._extract_pattern(text, 'nosso_numero')
        numero_documento = self._extract_pattern(text, 'numero_documento')
        
        # Extrair nomes (beneficiário e pagador)
        beneficiario, pagador = self._extract_nomes(text, text_lower)
        
        # Calcular score de confiança
        confidence = self._calculate_confidence(valor, datas, cnpjs, codigo_barras)
        
        return ExtractedInvoiceData(
            document_type=doc_type,
            raw_text=text[:5000],  # Limitar tamanho
            valor_total=valor,
            data_vencimento=datas.get('vencimento'),
            data_emissao=datas.get('emissao'),
            beneficiario_nome=beneficiario,
            beneficiario_cnpj=cnpjs[0] if cnpjs else None,
            pagador_nome=pagador,
            pagador_cnpj=cnpjs[1] if len(cnpjs) > 1 else None,
            codigo_barras=self._clean_barcode(codigo_barras),
            linha_digitavel=linha_digitavel,
            nosso_numero=nosso_numero,
            numero_documento=numero_documento,
            confidence_score=confidence,
            extraction_errors=errors
        )
    
    def _detect_document_type(self, text_lower: str) -> str:
        """Detecta o tipo de documento"""
        if any(word in text_lower for word in ['boleto', 'código de barras', 'linha digitável', 'banco']):
            return 'boleto'
        elif any(word in text_lower for word in ['fatura', 'invoice', 'cobrança']):
            return 'fatura'
        elif any(word in text_lower for word in ['nota fiscal', 'nf-e', 'danfe', 'nfe']):
            return 'nota_fiscal'
        elif any(word in text_lower for word in ['recibo', 'comprovante']):
            return 'recibo'
        else:
            return 'outros'
    
    def _extract_valor(self, text: str) -> Optional[float]:
        """Extrai o valor principal do documento"""
        for pattern in self.patterns['valor']:
            matches = re.findall(pattern, text, re.IGNORECASE)
            if matches:
                for match in matches:
                    try:
                        # Converter formato brasileiro para float
                        valor_str = match.replace('.', '').replace(',', '.')
                        valor = float(valor_str)
                        if 0.01 <= valor <= 10000000:  # Valor razoável
                            return valor
                    except ValueError:
                        continue
        return None
    
    def _extract_datas(self, text: str, text_lower: str) -> Dict[str, str]:
        """Extrai datas do documento"""
        datas = {}
        
        for pattern in self.patterns['data']:
            matches = re.findall(pattern, text)
            for match in matches:
                try:
                    # Tentar parsear a data
                    if '/' in match:
                        dt = datetime.strptime(match, '%d/%m/%Y')
                    elif match.startswith('20') or match.startswith('19'):
                        dt = datetime.strptime(match, '%Y-%m-%d')
                    else:
                        dt = datetime.strptime(match, '%d-%m-%Y')
                    
                    date_str = dt.strftime('%Y-%m-%d')
                    
                    # Tentar identificar se é vencimento ou emissão
                    # Procurar contexto próximo
                    idx = text.find(match)
                    context = text_lower[max(0, idx-50):idx+len(match)+50]
                    
                    if any(word in context for word in ['vencimento', 'venc', 'pagar até', 'data limite']):
                        datas['vencimento'] = date_str
                    elif any(word in context for word in ['emissão', 'emitido', 'data de']):
                        datas['emissao'] = date_str
                    elif 'vencimento' not in datas:
                        datas['vencimento'] = date_str
                        
                except ValueError:
                    continue
        
        return datas
    
    def _extract_cnpjs(self, text: str) -> List[str]:
        """Extrai CNPJs do documento"""
        cnpjs = []
        for pattern in self.patterns['cnpj']:
            matches = re.findall(pattern, text)
            for match in matches:
                # Normalizar CNPJ
                cnpj = re.sub(r'[^\d]', '', match)
                if len(cnpj) == 14 and cnpj not in cnpjs:
                    cnpjs.append(cnpj)
        return cnpjs
    
    def _extract_pattern(self, text: str, pattern_name: str) -> Optional[str]:
        """Extrai primeiro match de um padrão"""
        for pattern in self.patterns.get(pattern_name, []):
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                return match.group(1)
        return None
    
    def _extract_nomes(self, text: str, text_lower: str) -> tuple:
        """Extrai nomes de beneficiário e pagador"""
        beneficiario = None
        pagador = None
        
        # Procurar padrões de beneficiário
        patterns_benef = [
            r'(?:benefici[áa]rio|cedente|favorecido)\s*[:=]?\s*([A-Za-zÀ-ÿ\s\.]+?)(?:\n|CNPJ|CPF)',
            r'(?:razão social|empresa)\s*[:=]?\s*([A-Za-zÀ-ÿ\s\.]+?)(?:\n|CNPJ)',
        ]
        
        for pattern in patterns_benef:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                beneficiario = match.group(1).strip()[:100]
                break
        
        # Procurar padrões de pagador
        patterns_pagador = [
            r'(?:pagador|sacado|cliente)\s*[:=]?\s*([A-Za-zÀ-ÿ\s\.]+?)(?:\n|CNPJ|CPF)',
        ]
        
        for pattern in patterns_pagador:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                pagador = match.group(1).strip()[:100]
                break
        
        return beneficiario, pagador
    
    def _clean_barcode(self, barcode: Optional[str]) -> Optional[str]:
        """Limpa e valida código de barras"""
        if not barcode:
            return None
        
        # Remover espaços e pontos
        clean = re.sub(r'[^\d]', '', barcode)
        
        # Validar tamanho
        if len(clean) in [47, 48]:
            return clean
        
        return None
    
    def _calculate_confidence(self, valor, datas, cnpjs, codigo_barras) -> float:
        """Calcula score de confiança da extração"""
        score = 0.0
        
        if valor is not None:
            score += 0.3
        if datas.get('vencimento'):
            score += 0.25
        if cnpjs:
            score += 0.2
        if codigo_barras:
            score += 0.15
        if datas.get('emissao'):
            score += 0.1
        
        return round(score, 2)


class PayableMatcher:
    """Cruza dados extraídos com lançamentos financeiros"""
    
    def __init__(self, payables: List[Dict[str, Any]]):
        """
        Args:
            payables: Lista de contas a pagar do banco de dados
                      Cada item deve ter: id, supplier_id, amount, due_date, 
                      document_number, supplier_cnpj, supplier_name
        """
        self.payables = payables
    
    def find_matches(self, extracted: ExtractedInvoiceData) -> Dict[str, Any]:
        """
        Encontra lançamentos que correspondem aos dados extraídos
        
        Returns:
            Dict com:
                - exact_matches: correspondências exatas
                - partial_matches: correspondências parciais
                - suggested_action: ação sugerida
                - divergences: divergências encontradas
        """
        exact_matches = []
        partial_matches = []
        divergences = []
        
        for payable in self.payables:
            match_score = 0
            match_details = []
            divergence_details = []
            
            # 1. Comparar CNPJ do fornecedor
            if extracted.beneficiario_cnpj and payable.get('supplier_cnpj'):
                cnpj_payable = re.sub(r'[^\d]', '', payable['supplier_cnpj'])
                if extracted.beneficiario_cnpj == cnpj_payable:
                    match_score += 40
                    match_details.append('CNPJ do fornecedor confere')
            
            # 2. Comparar valor
            if extracted.valor_total and payable.get('amount'):
                diff = abs(extracted.valor_total - float(payable['amount']))
                if diff < 0.01:
                    match_score += 30
                    match_details.append('Valor exato')
                elif diff < 1.0:
                    match_score += 20
                    match_details.append(f'Valor aproximado (diff: R$ {diff:.2f})')
                elif diff / float(payable['amount']) < 0.05:  # 5% de diferença
                    match_score += 10
                    match_details.append(f'Valor com pequena divergência ({diff:.2f})')
                    divergence_details.append({
                        'field': 'valor',
                        'expected': payable['amount'],
                        'found': extracted.valor_total,
                        'difference': diff
                    })
            
            # 3. Comparar data de vencimento
            if extracted.data_vencimento and payable.get('due_date'):
                due_date_payable = str(payable['due_date'])[:10]
                if extracted.data_vencimento == due_date_payable:
                    match_score += 20
                    match_details.append('Data de vencimento confere')
                else:
                    divergence_details.append({
                        'field': 'vencimento',
                        'expected': due_date_payable,
                        'found': extracted.data_vencimento
                    })
            
            # 4. Comparar número do documento
            if extracted.numero_documento and payable.get('document_number'):
                if extracted.numero_documento in str(payable['document_number']):
                    match_score += 10
                    match_details.append('Número do documento confere')
            
            # Classificar match
            if match_score >= 70:
                exact_matches.append({
                    'payable': payable,
                    'score': match_score,
                    'details': match_details,
                    'divergences': divergence_details
                })
            elif match_score >= 40:
                partial_matches.append({
                    'payable': payable,
                    'score': match_score,
                    'details': match_details,
                    'divergences': divergence_details
                })
        
        # Ordenar por score
        exact_matches.sort(key=lambda x: x['score'], reverse=True)
        partial_matches.sort(key=lambda x: x['score'], reverse=True)
        
        # Determinar ação sugerida
        if exact_matches:
            if len(exact_matches) == 1:
                suggested_action = 'CONCILIAR_AUTOMATICO'
            else:
                suggested_action = 'SELECIONAR_MATCH'
        elif partial_matches:
            suggested_action = 'REVISAR_MANUAL'
        else:
            suggested_action = 'CRIAR_NOVO_LANCAMENTO'
        
        return {
            'exact_matches': exact_matches,
            'partial_matches': partial_matches,
            'suggested_action': suggested_action,
            'extracted_data': asdict(extracted),
            'total_payables_checked': len(self.payables)
        }


def process_invoice_and_match(pdf_path: str, payables: List[Dict]) -> Dict[str, Any]:
    """
    Função principal: processa um PDF e cruza com lançamentos
    
    Args:
        pdf_path: Caminho para o arquivo PDF
        payables: Lista de contas a pagar do sistema
        
    Returns:
        Resultado do cruzamento com matches e sugestões
    """
    # Extrair dados do PDF
    extractor = InvoiceExtractor()
    extracted = extractor.extract_from_pdf(pdf_path)
    
    # Cruzar com lançamentos
    matcher = PayableMatcher(payables)
    result = matcher.find_matches(extracted)
    
    return result


# Exemplo de uso e teste
if __name__ == '__main__':
    # Exemplo de payables do banco de dados
    sample_payables = [
        {
            'id': '1',
            'supplier_id': 'sup1',
            'supplier_name': 'Fornecedor ABC Ltda',
            'supplier_cnpj': '12.345.678/0001-90',
            'amount': 1500.00,
            'due_date': '2024-12-31',
            'document_number': '12345',
            'description': 'NF-e 12345'
        },
        {
            'id': '2',
            'supplier_id': 'sup2',
            'supplier_name': 'Empresa XYZ',
            'supplier_cnpj': '98.765.432/0001-10',
            'amount': 2500.50,
            'due_date': '2025-01-15',
            'document_number': '67890',
            'description': 'Fatura mensal'
        }
    ]
    
    # Teste com texto simulado
    sample_text = """
    BOLETO BANCÁRIO
    
    Beneficiário: Fornecedor ABC Ltda
    CNPJ: 12.345.678/0001-90
    
    Pagador: Minha Empresa
    CNPJ: 11.222.333/0001-44
    
    Valor: R$ 1.500,00
    Vencimento: 31/12/2024
    
    Nosso Número: 12345
    Código de Barras: 23793.38128 60000.000003 00000.000401 1 84340000150000
    """
    
    extractor = InvoiceExtractor()
    extracted = extractor.extract_from_text(sample_text)
    
    print("=== DADOS EXTRAÍDOS ===")
    print(f"Tipo: {extracted.document_type}")
    print(f"Valor: R$ {extracted.valor_total}")
    print(f"Vencimento: {extracted.data_vencimento}")
    print(f"Beneficiário: {extracted.beneficiario_nome}")
    print(f"CNPJ Beneficiário: {extracted.beneficiario_cnpj}")
    print(f"Código de Barras: {extracted.codigo_barras}")
    print(f"Confiança: {extracted.confidence_score * 100}%")
    
    print("\n=== CRUZAMENTO COM LANÇAMENTOS ===")
    matcher = PayableMatcher(sample_payables)
    result = matcher.find_matches(extracted)
    
    print(f"Ação sugerida: {result['suggested_action']}")
    print(f"Matches exatos: {len(result['exact_matches'])}")
    print(f"Matches parciais: {len(result['partial_matches'])}")
    
    if result['exact_matches']:
        match = result['exact_matches'][0]
        print(f"\nMelhor match: {match['payable']['supplier_name']}")
        print(f"Score: {match['score']}%")
        print(f"Detalhes: {', '.join(match['details'])}")
