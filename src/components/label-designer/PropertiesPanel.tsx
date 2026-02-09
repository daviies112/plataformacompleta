import React, { useState, useEffect } from 'react';
import * as fabricModule from 'fabric';
import { Input } from '@/components/ui/input';

const fabric = (fabricModule as any).fabric || fabricModule;
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface PropertiesPanelProps {
  selectedObject: fabric.Object | null;
  onUpdate: () => void;
}

const MM_TO_PX = 10;

export const PropertiesPanel: React.FC<PropertiesPanelProps> = ({
  selectedObject,
  onUpdate,
}) => {
  const [properties, setProperties] = useState<any>({});

  useEffect(() => {
    if (!selectedObject) {
      setProperties({});
      return;
    }

    const updateProperties = () => {
      const props: any = {
        left: ((selectedObject.left || 0) / MM_TO_PX).toFixed(2),
        top: ((selectedObject.top || 0) / MM_TO_PX).toFixed(2),
        width: (((selectedObject.width || 0) * (selectedObject.scaleX || 1)) / MM_TO_PX).toFixed(2),
        height: (((selectedObject.height || 0) * (selectedObject.scaleY || 1)) / MM_TO_PX).toFixed(2),
      };

      if (selectedObject.type === 'textbox' || selectedObject.type === 'text') {
        const textbox = selectedObject as fabric.Textbox;
        props.text = textbox.text || '';
        props.fontSize = textbox.fontSize || 12;
        props.fontFamily = textbox.fontFamily || 'Arial';
        props.fill = textbox.fill as string || '#000000';
        props.fontWeight = textbox.fontWeight || 'normal';
      }

      setProperties(props);
    };

    updateProperties();
  }, [selectedObject]);

  const handlePropertyChange = (key: string, value: any) => {
    if (!selectedObject) return;

    if (key === 'left' || key === 'top') {
      selectedObject.set(key, parseFloat(value) * MM_TO_PX);
    } else if (key === 'width') {
      const newScale = (parseFloat(value) * MM_TO_PX) / (selectedObject.width || 1);
      selectedObject.set('scaleX', newScale);
    } else if (key === 'height') {
      const newScale = (parseFloat(value) * MM_TO_PX) / (selectedObject.height || 1);
      selectedObject.set('scaleY', newScale);
    } else if (key === 'text' && (selectedObject.type === 'textbox' || selectedObject.type === 'text')) {
      (selectedObject as fabric.Textbox).set('text', value);
    } else if (key === 'fontSize' && (selectedObject.type === 'textbox' || selectedObject.type === 'text')) {
      (selectedObject as fabric.Textbox).set('fontSize', parseInt(value));
    } else if (key === 'fontFamily' && (selectedObject.type === 'textbox' || selectedObject.type === 'text')) {
      (selectedObject as fabric.Textbox).set('fontFamily', value);
    } else if (key === 'fill' && (selectedObject.type === 'textbox' || selectedObject.type === 'text')) {
      (selectedObject as fabric.Textbox).set('fill', value);
    } else if (key === 'fontWeight' && (selectedObject.type === 'textbox' || selectedObject.type === 'text')) {
      (selectedObject as fabric.Textbox).set('fontWeight', value);
    }

    selectedObject.setCoords();
    selectedObject.canvas?.renderAll();
    onUpdate();

    setProperties((prev: any) => ({ ...prev, [key]: value }));
  };

  if (!selectedObject) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Propriedades</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-500">Selecione um elemento para editar suas propriedades</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">Propriedades do Elemento</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="left" className="text-xs">Esquerda (mm)</Label>
            <Input
              id="left"
              type="number"
              step="0.1"
              value={properties.left || 0}
              onChange={(e) => handlePropertyChange('left', e.target.value)}
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="top" className="text-xs">Topo (mm)</Label>
            <Input
              id="top"
              type="number"
              step="0.1"
              value={properties.top || 0}
              onChange={(e) => handlePropertyChange('top', e.target.value)}
              className="mt-1"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="width" className="text-xs">Largura (mm)</Label>
            <Input
              id="width"
              type="number"
              step="0.1"
              value={properties.width || 0}
              onChange={(e) => handlePropertyChange('width', e.target.value)}
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="height" className="text-xs">Altura (mm)</Label>
            <Input
              id="height"
              type="number"
              step="0.1"
              value={properties.height || 0}
              onChange={(e) => handlePropertyChange('height', e.target.value)}
              className="mt-1"
            />
          </div>
        </div>

        {(selectedObject.type === 'textbox' || selectedObject.type === 'text') && (
          <>
            <div>
              <Label htmlFor="text" className="text-xs">Texto</Label>
              <Input
                id="text"
                type="text"
                value={properties.text || ''}
                onChange={(e) => handlePropertyChange('text', e.target.value)}
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="fontSize" className="text-xs">Tamanho da Fonte</Label>
              <Input
                id="fontSize"
                type="number"
                min="6"
                max="72"
                value={properties.fontSize || 12}
                onChange={(e) => handlePropertyChange('fontSize', e.target.value)}
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="fontFamily" className="text-xs">Fonte</Label>
              <Select
                value={properties.fontFamily || 'Arial'}
                onValueChange={(value) => handlePropertyChange('fontFamily', value)}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Arial">Arial</SelectItem>
                  <SelectItem value="Helvetica">Helvetica</SelectItem>
                  <SelectItem value="Times New Roman">Times New Roman</SelectItem>
                  <SelectItem value="Courier New">Courier New</SelectItem>
                  <SelectItem value="Georgia">Georgia</SelectItem>
                  <SelectItem value="Verdana">Verdana</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="fill" className="text-xs">Cor</Label>
              <div className="flex gap-2 mt-1">
                <Input
                  id="fill"
                  type="color"
                  value={properties.fill || '#000000'}
                  onChange={(e) => handlePropertyChange('fill', e.target.value)}
                  className="w-16 h-10 p-1"
                />
                <Input
                  type="text"
                  value={properties.fill || '#000000'}
                  onChange={(e) => handlePropertyChange('fill', e.target.value)}
                  className="flex-1"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="fontWeight" className="text-xs">Peso da Fonte</Label>
              <Select
                value={properties.fontWeight || 'normal'}
                onValueChange={(value) => handlePropertyChange('fontWeight', value)}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="bold">Negrito</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};
