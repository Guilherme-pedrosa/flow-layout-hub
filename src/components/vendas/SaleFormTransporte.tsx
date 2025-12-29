import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Truck, MapPin } from "lucide-react";
import { useState } from "react";

interface SaleFormTransporteProps {
  formData: {
    freight_value: string | number;
    carrier: string;
    show_delivery_address: boolean;
    delivery_address: {
      cep?: string;
      logradouro?: string;
      numero?: string;
      complemento?: string;
      bairro?: string;
      cidade?: string;
      estado?: string;
    };
  };
  onChange: (field: string, value: any) => void;
}

export function SaleFormTransporte({ formData, onChange }: SaleFormTransporteProps) {
  const handleAddressChange = (field: string, value: string) => {
    onChange('delivery_address', {
      ...formData.delivery_address,
      [field]: value
    });
  };

  return (
    <div className="space-y-6">
      {/* Transporte */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Truck className="h-5 w-5" />
            Transporte
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Valor do frete</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={formData.freight_value}
                onChange={(e) => onChange('freight_value', parseFloat(e.target.value) || 0)}
              />
            </div>

            <div className="space-y-2">
              <Label>Transportadora</Label>
              <Input
                value={formData.carrier}
                onChange={(e) => onChange('carrier', e.target.value)}
                placeholder="Digite para buscar"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Endereço de Entrega */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-lg">
            <MapPin className="h-5 w-5" />
            Endereço de entrega
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-2 mb-4">
            <Checkbox
              id="show_delivery"
              checked={formData.show_delivery_address}
              onCheckedChange={(checked) => onChange('show_delivery_address', checked)}
            />
            <label
              htmlFor="show_delivery"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              Informar endereço de entrega
            </label>
          </div>

          {formData.show_delivery_address && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label>CEP</Label>
                <Input
                  value={formData.delivery_address.cep ?? ''}
                  onChange={(e) => handleAddressChange('cep', e.target.value)}
                  placeholder="00000-000"
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label>Logradouro</Label>
                <Input
                  value={formData.delivery_address.logradouro ?? ''}
                  onChange={(e) => handleAddressChange('logradouro', e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>Número</Label>
                <Input
                  value={formData.delivery_address.numero ?? ''}
                  onChange={(e) => handleAddressChange('numero', e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>Complemento</Label>
                <Input
                  value={formData.delivery_address.complemento ?? ''}
                  onChange={(e) => handleAddressChange('complemento', e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>Bairro</Label>
                <Input
                  value={formData.delivery_address.bairro ?? ''}
                  onChange={(e) => handleAddressChange('bairro', e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>Cidade</Label>
                <Input
                  value={formData.delivery_address.cidade ?? ''}
                  onChange={(e) => handleAddressChange('cidade', e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>Estado</Label>
                <Input
                  value={formData.delivery_address.estado ?? ''}
                  onChange={(e) => handleAddressChange('estado', e.target.value)}
                  maxLength={2}
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
