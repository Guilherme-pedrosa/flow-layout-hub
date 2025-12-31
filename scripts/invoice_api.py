#!/usr/bin/env python3
"""
API para extração e cruzamento de faturas com lançamentos financeiros
Integra com o Flow Layout Hub via Supabase
"""

import os
import json
import tempfile
from flask import Flask, request, jsonify
from flask_cors import CORS
from supabase import create_client, Client
from invoice_extractor import InvoiceExtractor, PayableMatcher, ExtractedInvoiceData
from dataclasses import asdict
from datetime import datetime, timedelta

app = Flask(__name__)
CORS(app)

# Configuração Supabase
SUPABASE_URL = os.environ.get('SUPABASE_URL', '')
SUPABASE_KEY = os.environ.get('SUPABASE_SERVICE_ROLE_KEY', '')

supabase: Client = None
if SUPABASE_URL and SUPABASE_KEY:
    supabase = create_client(SUPABASE_URL, SUPABASE_KEY)


def get_payables_for_matching(company_id: str, filters: dict = None) -> list:
    """
    Busca contas a pagar do Supabase para cruzamento
    """
    if not supabase:
        return []
    
    try:
        query = supabase.table('payables').select(
            'id, supplier_id, amount, due_date, document_number, document_type, '
            'description, is_paid, is_forecast, '
            'supplier:pessoas(id, razao_social, nome_fantasia, cpf_cnpj)'
        ).eq('company_id', company_id).eq('is_paid', False)
        
        # Aplicar filtros opcionais
        if filters:
            if filters.get('min_date'):
                query = query.gte('due_date', filters['min_date'])
            if filters.get('max_date'):
                query = query.lte('due_date', filters['max_date'])
            if filters.get('min_amount'):
                query = query.gte('amount', filters['min_amount'])
            if filters.get('max_amount'):
                query = query.lte('amount', filters['max_amount'])
        
        result = query.execute()
        
        # Formatar dados para o matcher
        payables = []
        for p in result.data or []:
            supplier = p.get('supplier') or {}
            payables.append({
                'id': p['id'],
                'supplier_id': p['supplier_id'],
                'supplier_name': supplier.get('razao_social') or supplier.get('nome_fantasia') or 'Desconhecido',
                'supplier_cnpj': supplier.get('cpf_cnpj'),
                'amount': float(p['amount'] or 0),
                'due_date': p['due_date'],
                'document_number': p.get('document_number'),
                'document_type': p.get('document_type'),
                'description': p.get('description'),
                'is_forecast': p.get('is_forecast', False)
            })
        
        return payables
        
    except Exception as e:
        print(f"Erro ao buscar payables: {e}")
        return []


@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'ok',
        'service': 'invoice-extractor',
        'supabase_connected': supabase is not None
    })


@app.route('/extract', methods=['POST'])
def extract_invoice():
    """
    Extrai dados de uma fatura/boleto
    
    Aceita:
    - multipart/form-data com arquivo PDF
    - application/json com texto ou base64
    """
    extractor = InvoiceExtractor()
    
    try:
        # Verificar se é upload de arquivo
        if 'file' in request.files:
            file = request.files['file']
            if file.filename == '':
                return jsonify({'error': 'Nenhum arquivo selecionado'}), 400
            
            # Salvar temporariamente
            with tempfile.NamedTemporaryFile(delete=False, suffix='.pdf') as tmp:
                file.save(tmp.name)
                extracted = extractor.extract_from_pdf(tmp.name)
                os.unlink(tmp.name)
        
        # Verificar se é JSON com texto
        elif request.is_json:
            data = request.get_json()
            
            if 'text' in data:
                extracted = extractor.extract_from_text(data['text'])
            elif 'base64' in data:
                import base64
                pdf_bytes = base64.b64decode(data['base64'])
                with tempfile.NamedTemporaryFile(delete=False, suffix='.pdf') as tmp:
                    tmp.write(pdf_bytes)
                    tmp.flush()
                    extracted = extractor.extract_from_pdf(tmp.name)
                    os.unlink(tmp.name)
            else:
                return jsonify({'error': 'Envie text ou base64 no JSON'}), 400
        else:
            return jsonify({'error': 'Envie um arquivo PDF ou JSON com texto/base64'}), 400
        
        return jsonify({
            'success': True,
            'data': asdict(extracted)
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@app.route('/match', methods=['POST'])
def match_with_payables():
    """
    Cruza dados extraídos com lançamentos financeiros
    
    Body JSON:
    {
        "company_id": "uuid",
        "extracted_data": { ... } ou "text": "..." ou "file": base64
        "filters": {
            "min_date": "2024-01-01",
            "max_date": "2024-12-31",
            "min_amount": 100,
            "max_amount": 10000
        }
    }
    """
    try:
        data = request.get_json()
        
        if not data.get('company_id'):
            return jsonify({'error': 'company_id é obrigatório'}), 400
        
        company_id = data['company_id']
        filters = data.get('filters', {})
        
        # Se não tem dados extraídos, extrair primeiro
        if 'extracted_data' in data:
            extracted_dict = data['extracted_data']
            extracted = ExtractedInvoiceData(**extracted_dict)
        elif 'text' in data:
            extractor = InvoiceExtractor()
            extracted = extractor.extract_from_text(data['text'])
        elif 'base64' in data:
            import base64
            extractor = InvoiceExtractor()
            pdf_bytes = base64.b64decode(data['base64'])
            with tempfile.NamedTemporaryFile(delete=False, suffix='.pdf') as tmp:
                tmp.write(pdf_bytes)
                tmp.flush()
                extracted = extractor.extract_from_pdf(tmp.name)
                os.unlink(tmp.name)
        else:
            return jsonify({'error': 'Envie extracted_data, text ou base64'}), 400
        
        # Buscar payables do banco
        payables = get_payables_for_matching(company_id, filters)
        
        if not payables:
            return jsonify({
                'success': True,
                'data': {
                    'exact_matches': [],
                    'partial_matches': [],
                    'suggested_action': 'CRIAR_NOVO_LANCAMENTO',
                    'extracted_data': asdict(extracted),
                    'total_payables_checked': 0,
                    'message': 'Nenhuma conta a pagar encontrada para cruzamento'
                }
            })
        
        # Fazer o cruzamento
        matcher = PayableMatcher(payables)
        result = matcher.find_matches(extracted)
        
        return jsonify({
            'success': True,
            'data': result
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@app.route('/reconcile', methods=['POST'])
def reconcile_payable():
    """
    Concilia um payable com os dados extraídos
    
    Body JSON:
    {
        "payable_id": "uuid",
        "extracted_data": { ... },
        "action": "confirm" | "update_and_confirm"
    }
    """
    try:
        data = request.get_json()
        
        if not supabase:
            return jsonify({'error': 'Supabase não configurado'}), 500
        
        payable_id = data.get('payable_id')
        action = data.get('action', 'confirm')
        extracted = data.get('extracted_data', {})
        
        if not payable_id:
            return jsonify({'error': 'payable_id é obrigatório'}), 400
        
        # Buscar payable atual
        result = supabase.table('payables').select('*').eq('id', payable_id).single().execute()
        payable = result.data
        
        if not payable:
            return jsonify({'error': 'Conta a pagar não encontrada'}), 404
        
        # Preparar atualização
        update_data = {
            'reconciled_at': datetime.now().isoformat(),
            'reconciliation_source': 'docling_extract'
        }
        
        # Se ação é atualizar e confirmar, atualizar campos
        if action == 'update_and_confirm':
            if extracted.get('valor_total'):
                update_data['amount'] = extracted['valor_total']
            if extracted.get('data_vencimento'):
                update_data['due_date'] = extracted['data_vencimento']
            if extracted.get('codigo_barras'):
                update_data['boleto_barcode'] = extracted['codigo_barras']
            if extracted.get('linha_digitavel'):
                update_data['boleto_digitable_line'] = extracted['linha_digitavel']
        
        # Atualizar no banco
        supabase.table('payables').update(update_data).eq('id', payable_id).execute()
        
        # Registrar no audit_log
        supabase.table('audit_logs').insert({
            'company_id': payable['company_id'],
            'action': 'reconcile_invoice',
            'entity': 'payables',
            'entity_id': payable_id,
            'metadata_json': {
                'extracted_data': extracted,
                'action': action,
                'previous_amount': payable.get('amount'),
                'previous_due_date': payable.get('due_date')
            }
        }).execute()
        
        return jsonify({
            'success': True,
            'message': 'Conta a pagar conciliada com sucesso',
            'payable_id': payable_id
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@app.route('/analyze-batch', methods=['POST'])
def analyze_batch():
    """
    Analisa múltiplos arquivos e retorna resumo
    
    Body: multipart/form-data com múltiplos arquivos
    """
    try:
        if 'files' not in request.files:
            return jsonify({'error': 'Nenhum arquivo enviado'}), 400
        
        files = request.files.getlist('files')
        company_id = request.form.get('company_id')
        
        extractor = InvoiceExtractor()
        results = []
        
        for file in files:
            if file.filename == '':
                continue
            
            with tempfile.NamedTemporaryFile(delete=False, suffix='.pdf') as tmp:
                file.save(tmp.name)
                extracted = extractor.extract_from_pdf(tmp.name)
                os.unlink(tmp.name)
                
                result = {
                    'filename': file.filename,
                    'extracted': asdict(extracted)
                }
                
                # Se tem company_id, fazer cruzamento
                if company_id:
                    payables = get_payables_for_matching(company_id)
                    if payables:
                        matcher = PayableMatcher(payables)
                        match_result = matcher.find_matches(extracted)
                        result['matches'] = match_result
                
                results.append(result)
        
        # Resumo
        total_valor = sum(r['extracted'].get('valor_total') or 0 for r in results)
        matched_count = sum(1 for r in results if r.get('matches', {}).get('exact_matches'))
        
        return jsonify({
            'success': True,
            'summary': {
                'total_files': len(results),
                'total_valor': total_valor,
                'matched_count': matched_count,
                'unmatched_count': len(results) - matched_count
            },
            'results': results
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=True)
