import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Trash2, Save, FilePlus, Edit } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export interface TransformationPreset {
  id: string;
  name: string;
  description?: string;
  sanitizationOptions: Record<string, any>;
  columnSelections?: Record<string, boolean>;
  dateCreated: string;
  dateModified?: string;
}

interface PresetManagerProps {
  selectedPreset: string | null;
  onPresetSelect: (presetId: string) => void;
  currentOptions?: Record<string, any>;
  columnSelections?: Record<string, boolean>;
  onApplyPreset?: (preset: TransformationPreset) => void;
}

export function PresetManager({
  selectedPreset,
  onPresetSelect,
  currentOptions,
  columnSelections,
  onApplyPreset,
}: PresetManagerProps) {
  const [presets, setPresets] = useState<TransformationPreset[]>([]);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newPresetName, setNewPresetName] = useState("");
  const [newPresetDescription, setNewPresetDescription] = useState("");

  // Load presets from localStorage
  useEffect(() => {
    const loadedPresets = localStorage.getItem("transformationPresets");
    if (loadedPresets) {
      try {
        setPresets(JSON.parse(loadedPresets));
      } catch (error) {
        console.error("Error loading presets:", error);
        setPresets([]);
      }
    } else {
      // Add sample presets for first-time users
      const samplePresets: TransformationPreset[] = [
        {
          id: "default-1",
          name: "Standard Format",
          description: "Basic data sanitization for insurance forms",
          sanitizationOptions: {
            removeSpecialChars: true,
            replaceWithSpace: true,
            sanitizeZipCodes: true,
            countryFormat: "US",
          },
          dateCreated: new Date().toISOString(),
        },
        {
          id: "default-2",
          name: "Policy Report Format",
          description: "Format and standardize policy data",
          sanitizationOptions: {
            removeSpecialChars: true,
            formatPolicyNumbers: true,
            autoDetectPolicyFormat: true,
            formatSSNs: true,
            ssnFormat: "XXX-XX-****",
          },
          dateCreated: new Date().toISOString(),
        },
      ];

      setPresets(samplePresets);
      localStorage.setItem(
        "transformationPresets",
        JSON.stringify(samplePresets),
      );
    }
  }, []);

  const handleSavePreset = () => {
    if (!newPresetName.trim()) {
      alert("Please enter a name for the preset");
      return;
    }

    const newPreset: TransformationPreset = {
      id: `preset-${Date.now()}`,
      name: newPresetName.trim(),
      description: newPresetDescription.trim() || undefined,
      sanitizationOptions: currentOptions || {},
      columnSelections: columnSelections || {},
      dateCreated: new Date().toISOString(),
    };

    const updatedPresets = [...presets, newPreset];
    setPresets(updatedPresets);
    localStorage.setItem(
      "transformationPresets",
      JSON.stringify(updatedPresets),
    );

    setIsCreateOpen(false);
    setNewPresetName("");
    setNewPresetDescription("");
  };

  const handleDeletePreset = (id: string) => {
    const updatedPresets = presets.filter((preset) => preset.id !== id);
    setPresets(updatedPresets);
    localStorage.setItem(
      "transformationPresets",
      JSON.stringify(updatedPresets),
    );

    if (selectedPreset === id) {
      onPresetSelect("");
    }
  };

  const handleApplyPreset = (preset: TransformationPreset) => {
    onPresetSelect(preset.id);

    if (onApplyPreset) {
      onApplyPreset(preset);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">Transformation Presets</h3>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm">
              <FilePlus className="mr-2 size-4" />
              New Preset
            </Button>
          </DialogTrigger>

          <DialogContent>
            <DialogHeader>
              <DialogTitle>Save Transformation Preset</DialogTitle>
              <DialogDescription>
                Save your current configuration as a preset for future use.
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="name">Preset Name</Label>
                <Input
                  id="name"
                  placeholder="Enter preset name"
                  value={newPresetName}
                  onChange={(e) => setNewPresetName(e.target.value)}
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="description">Description (optional)</Label>
                <Textarea
                  id="description"
                  placeholder="Enter a description for this preset"
                  value={newPresetDescription}
                  onChange={(e) => setNewPresetDescription(e.target.value)}
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSavePreset}>
                <Save className="mr-2 size-4" />
                Save Preset
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-2">
        {presets.length === 0 ? (
          <div className="text-muted-foreground rounded-md border border-dashed p-4 text-center text-sm">
            No presets saved. Create a new preset to get started.
          </div>
        ) : (
          presets.map((preset) => (
            <Card
              key={preset.id}
              className={`cursor-pointer transition-colors ${
                selectedPreset === preset.id ? "border-primary" : ""
              }`}
              onClick={() => handleApplyPreset(preset)}
            >
              <CardContent className="flex items-center justify-between p-4">
                <div>
                  <h4 className="font-medium">{preset.name}</h4>
                  {preset.description && (
                    <p className="text-sm text-gray-500">
                      {preset.description}
                    </p>
                  )}
                  <p className="text-muted-foreground text-xs">
                    Created {new Date(preset.dateCreated).toLocaleDateString()}
                  </p>
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
                      e.stopPropagation();
                      // Not implemented yet
                      alert(
                        "Edit functionality will be available in a future update",
                      );
                    }}
                  >
                    <Edit className="size-4" />
                  </Button>

                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-destructive hover:text-destructive"
                    onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
                      e.stopPropagation();
                      handleDeletePreset(preset.id);
                    }}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
