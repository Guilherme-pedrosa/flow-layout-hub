-- 1. Colunas de integração Field Control na service_orders
ALTER TABLE service_orders 
  ADD COLUMN IF NOT EXISTS scheduled_time TIME,
  ADD COLUMN IF NOT EXISTS estimated_duration INTEGER DEFAULT 60,
  ADD COLUMN IF NOT EXISTS field_order_id VARCHAR(50),
  ADD COLUMN IF NOT EXISTS field_task_id VARCHAR(50),
  ADD COLUMN IF NOT EXISTS field_synced_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS field_sync_status VARCHAR(20) DEFAULT 'pending';

-- 2. Tabela service_types (tipos de serviço com mapeamento Field)
CREATE TABLE IF NOT EXISTS service_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) NOT NULL,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  field_service_id VARCHAR(50),
  default_duration INTEGER DEFAULT 60,
  color VARCHAR(7) DEFAULT '#3B82F6',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Tabela equipments (equipamentos por cliente)
CREATE TABLE IF NOT EXISTS equipments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) NOT NULL,
  client_id UUID REFERENCES clientes(id),
  serial_number VARCHAR(100) NOT NULL,
  model VARCHAR(100),
  brand VARCHAR(100),
  equipment_type VARCHAR(100),
  location_description VARCHAR(200),
  sector VARCHAR(100),
  environment VARCHAR(100),
  notes TEXT,
  warranty_start DATE,
  warranty_end DATE,
  qr_code VARCHAR(100),
  is_active BOOLEAN DEFAULT true,
  field_equipment_id VARCHAR(50),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Campo field_employee_id na tabela users
ALTER TABLE users ADD COLUMN IF NOT EXISTS field_employee_id VARCHAR(50);

-- 5. Coluna service_type_id na service_orders
ALTER TABLE service_orders ADD COLUMN IF NOT EXISTS service_type_id UUID REFERENCES service_types(id);

-- 6. Coluna equipment_id na service_orders
ALTER TABLE service_orders ADD COLUMN IF NOT EXISTS equipment_id UUID REFERENCES equipments(id);

-- 7. RLS para service_types
ALTER TABLE service_types ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários acessam service_types da empresa"
ON service_types FOR ALL
USING (company_id IN (SELECT get_user_companies()))
WITH CHECK (company_id IN (SELECT get_user_companies()));

-- 8. RLS para equipments
ALTER TABLE equipments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários acessam equipments da empresa"
ON equipments FOR ALL
USING (company_id IN (SELECT get_user_companies()))
WITH CHECK (company_id IN (SELECT get_user_companies()));

-- 9. Índices para performance
CREATE INDEX IF NOT EXISTS idx_service_orders_field_order_id ON service_orders(field_order_id);
CREATE INDEX IF NOT EXISTS idx_service_orders_field_sync_status ON service_orders(field_sync_status);
CREATE INDEX IF NOT EXISTS idx_equipments_client_id ON equipments(client_id);
CREATE INDEX IF NOT EXISTS idx_equipments_serial_number ON equipments(serial_number);
CREATE INDEX IF NOT EXISTS idx_service_types_company_id ON service_types(company_id);