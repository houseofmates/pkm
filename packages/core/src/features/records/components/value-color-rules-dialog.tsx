import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Trash2, Plus, Palette } from "lucide-react";
import { HexColorPicker } from "react-colorful";
import { cn } from "@/lib/utils";

interface ValueColorRulesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  field: any;
  rules: Record<string, string>;
  onSetRule: (value: string, color: string) => void;
}

// preset colors for quick selection
const PRESET_COLORS = [
  "#ef4444", "#f97316", "#eab308", "#22c55e",
  "#06b6d4", "#3b82f6", "#8b5cf6", "#ec4899",
  "#64748b", "#ffffff",
];

export function ValueColorRulesDialog({
  open,
  onOpenChange,
  field,
  rules,
  onSetRule,
}: ValueColorRulesDialogProps) {
  const [newRuleValue, setNewRuleValue] = React.useState("");
  const [newRuleColor, setNewRuleColor] = React.useState("#3b82f6");
  const [editingKey, setEditingKey] = React.useState<string | null>(null);
  const [pickerColor, setPickerColor] = React.useState("#3b82f6");

  // determine if this field has predefined options (select, multipleselect, radiogroup, checkboxgroup)
  const isSelectType =
    field?.interface === "select" ||
    field?.interface === "multipleSelect" ||
    field?.interface === "radioGroup" ||
    field?.interface === "checkboxGroup" ||
    field?.type === "select" ||
    field?.type === "multipleSelect";

  const selectOptions: { value: string; label: string }[] =
    field?.uiSchema?.enum || [];

  const isNumberType =
    field?.interface === "number" ||
    field?.interface === "integer" ||
    field?.interface === "percent" ||
    field?.type === "number" ||
    field?.type === "integer" ||
    field?.type === "percent";

  const handleAddRule = () => {
    if (!newRuleValue.trim()) return;
    onSetRule(newRuleValue.trim(), newRuleColor);
    setNewRuleValue("");
    setNewRuleColor("#3b82f6");
  };

  const handleRemoveRule = (val: string) => {
    onSetRule(val, "");
  };

  const handleUpdateColor = (val: string, color: string) => {
    onSetRule(val, color);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="lowercase flex items-center gap-2">
            <Palette className="w-4 h-4" />
            value color rules: {field?.uiSchema?.title || field?.name || "field"}
          </DialogTitle>
          <DialogDescription className="lowercase">
            {isSelectType
              ? "assign colors to each option. cells matching these values will be tinted."
              : isNumberType
              ? "add number values to match. cells with these exact values will be colored."
              : "add text values to match. cells containing these exact values will be colored."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* existing rules */}
          <ScrollArea className="max-h-[300px]">
            <div className="space-y-2 pr-2">
              {isSelectType && selectOptions.length > 0 ? (
                // select-type: show all options, let user assign colors
                selectOptions.map((opt) => {
                  const currentColor = rules[opt.value] || "";
                  const isEditing = editingKey === opt.value;
                  return (
                    <div
                      key={opt.value}
                      className="flex items-center gap-2 p-2 rounded-md border border-[#222] bg-[#0f0f0f]"
                    >
                      <div className="flex-1 text-sm text-white/90 lowercase">
                        {opt.label || opt.value}
                      </div>
                      <div className="flex items-center gap-2">
                        {currentColor ? (
                          <div
                            className="w-6 h-6 rounded-full border border-white/20 cursor-pointer hover:scale-110 transition-transform"
                            style={{ backgroundColor: currentColor }}
                            onClick={() => {
                              setEditingKey(isEditing ? null : opt.value);
                              setPickerColor(currentColor);
                            }}
                          />
                        ) : (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 text-xs lowercase opacity-50 hover:opacity-100"
                            onClick={() => {
                              setEditingKey(opt.value);
                              setPickerColor("#3b82f6");
                            }}
                          >
                            + color
                          </Button>
                        )}
                        {currentColor && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 opacity-50 hover:opacity-100"
                            onClick={() => handleRemoveRule(opt.value)}
                            title="clear color"
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        )}
                      </div>
                      {isEditing && (
                        <div className="absolute z-50 mt-2">
                          {/* rendered below in a portal-like manner */}
                        </div>
                      )}
                    </div>
                  );
                })
              ) : (
                // text/number type: show existing rules
                <>
                  {Object.entries(rules).map(([val, color]) => (
                    <div
                      key={val}
                      className="flex items-center gap-2 p-2 rounded-md border border-[#222] bg-[#0f0f0f]"
                    >
                      <div className="flex-1 text-sm text-white/90 font-mono lowercase">
                        {val}
                      </div>
                      <div
                        className="w-6 h-6 rounded-full border border-white/20 cursor-pointer hover:scale-110 transition-transform"
                        style={{ backgroundColor: color }}
                        onClick={() => {
                          setEditingKey(editingKey === val ? null : val);
                          setPickerColor(color);
                        }}
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 opacity-50 hover:opacity-100"
                        onClick={() => handleRemoveRule(val)}
                        title="remove rule"
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  ))}
                  {Object.keys(rules).length === 0 && (
                    <div className="text-xs text-muted-foreground lowercase p-2">
                      no rules yet. add one below.
                    </div>
                  )}
                </>
              )}
            </div>
          </ScrollArea>

          {/* color picker for editing existing rule */}
          {editingKey !== null && (
            <div className="p-3 rounded-md border border-[#333] bg-[#111] space-y-3">
              <div className="text-xs text-muted-foreground lowercase">
                editing color for: <span className="text-white font-medium">{editingKey}</span>
              </div>
              <HexColorPicker
                color={pickerColor}
                onChange={(c) => {
                  setPickerColor(c);
                  handleUpdateColor(editingKey, c);
                }}
                style={{ width: "100%", height: "120px" }}
              />
              <div className="flex flex-wrap gap-1">
                {PRESET_COLORS.map((c) => (
                  <div
                    key={c}
                    className={cn(
                      "w-6 h-6 rounded-full cursor-pointer hover:scale-110 transition-transform border",
                      pickerColor === c ? "border-white ring-1 ring-white" : "border-white/20"
                    )}
                    style={{ backgroundColor: c }}
                    onClick={() => {
                      setPickerColor(c);
                      handleUpdateColor(editingKey, c);
                    }}
                  />
                ))}
              </div>
              <Button
                size="sm"
                variant="ghost"
                className="text-xs lowercase"
                onClick={() => setEditingKey(null)}
              >
                done
              </Button>
            </div>
          )}

          {/* add new rule (for text/number types) */}
          {!isSelectType && (
            <div className="space-y-2 pt-2 border-t border-[#222]">
              <Label className="text-xs lowercase">add new rule</Label>
              <div className="flex items-center gap-2">
                <Input
                  placeholder={isNumberType ? "match number (exact)" : "match text (exact)"}
                  className="h-8 text-xs flex-1"
                  type={isNumberType ? "number" : "text"}
                  value={newRuleValue}
                  onChange={(e) => setNewRuleValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleAddRule();
                  }}
                />
                <div
                  className="w-8 h-8 rounded-full border border-white/20 cursor-pointer hover:scale-110 transition-transform flex-shrink-0"
                  style={{ backgroundColor: newRuleColor }}
                  onClick={() => {
                    setEditingKey("__new__");
                    setPickerColor(newRuleColor);
                  }}
                />
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8 flex-shrink-0"
                  title="add rule"
                  onClick={handleAddRule}
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
              {/* color picker for new rule */}
              {editingKey === "__new__" && (
                <div className="p-3 rounded-md border border-[#333] bg-[#111] space-y-3">
                  <div className="text-xs text-muted-foreground lowercase">
                    pick color for new rule
                  </div>
                  <HexColorPicker
                    color={pickerColor}
                    onChange={(c) => {
                      setPickerColor(c);
                      setNewRuleColor(c);
                    }}
                    style={{ width: "100%", height: "120px" }}
                  />
                  <div className="flex flex-wrap gap-1">
                    {PRESET_COLORS.map((c) => (
                      <div
                        key={c}
                        className={cn(
                          "w-6 h-6 rounded-full cursor-pointer hover:scale-110 transition-transform border",
                          pickerColor === c ? "border-white ring-1 ring-white" : "border-white/20"
                        )}
                        style={{ backgroundColor: c }}
                        onClick={() => {
                          setPickerColor(c);
                          setNewRuleColor(c);
                        }}
                      />
                    ))}
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-xs lowercase"
                    onClick={() => setEditingKey(null)}
                  >
                    done
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} className="lowercase">
            close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
