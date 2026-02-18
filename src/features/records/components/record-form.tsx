
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RelationshipPicker } from "@/components/relationship-picker";
import { Loader2 } from "lucide-react";
import type { Collection } from "@/hooks/use-collections";
import { BlockEditor } from "@/components/editor/BlockEditor";

interface RecordFormProps {
  collection: Collection;
  initialData?: any;
  onSubmit: (data: any) => void;
  onCancel: () => void;
}

export function RecordForm({ collection, initialData, onSubmit, onCancel }: RecordFormProps) {
  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm({
  defaultValues: initialData || {}
  });

  // reactive formulas (phase 3: pure data power)
  // listens for 'price' and 'quantity' fields and updates 'total' instantly
  const price = watch('price');
  const quantity = watch('quantity');
  const qty = watch('qty'); // handle alias

  useEffect(() => {
  const p = parseFloat(price);
  const q = parseFloat(quantity || qty);
  if (!isNaN(p) && !isNaN(q)) {
  const total = (p * q).toFixed(2);
  // only update if current value is different to avoid loops (though setvalue handles it usually)
  setValue('total', total);
  }
  }, [price, quantity, qty, setValue]);

  // if fields is undefined, we are likely still loading the collection meta
  if (!collection.fields) {
  return <div className="p-4 text-center text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin inline mr-2" /> loading fields...</div>;
  }

  const fields = collection.fields.filter((f: any) => !f.hidden && f.interface !== 'subTable' && !['createdAt', 'updatedAt', 'createdBy', 'updatedBy'].includes(f.name));

  return (
  <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 max-h-[70vh] overflow-y-auto px-1">
  {fields.length > 0 ? (
 <div className="grid grid-cols-1 gap-4">
 {fields.map((field: any) => {
 // check if it's a relationship field
 if (field.interface === 'linkTo' || field.interface === 'm2o') {
   const targetCollection = field.target; // Assuming 'target' property holds the related collection name
   return (
   <div key={field.name} className="space-y-2">
   <Label htmlFor={field.name}>{field.uiSchema?.title || field.name}</Label>
   <div className="block">
  <RelationshipPicker
  collectionName={targetCollection}
  value={watch(field.name)}
  onSelect={(val) => setValue(field.name, val)} // We might need to handle specific FK format (e.g. ID only)
  />
   </div>
   </div>
   );
 }

 return (
   <div key={field.name} className="space-y-2">
   <Label htmlFor={field.name}>{field.uiSchema?.title || field.name}</Label>
   {['textarea', 'markdown', 'richText', 'longText'].includes(field.interface) ? (
   <BlockEditor
  content={watch(field.name)}
  onChange={(val) => setValue(field.name, val)}
  placeholder={`type '/' for commands in ${field.uiSchema?.title || field.name}`}
   />
   ) : (
   <Input
  id={field.name}
  {...register(field.name, { required: !field.uiSchema?.nullable })}
  placeholder={field.uiSchema?.title || field.name}
   />
   )}
   {errors[field.name] && <span className="text-sm text-red-500">this field is required</span>}
   </div>
 );
 })}
 </div>
  ) : (
 <div className="text-muted-foreground p-4 text-center">no fields available</div>
  )}

  <div className="flex justify-end pt-4 space-x-2">
 <Button type="button" variant="outline" onClick={onCancel}>cancel</Button>
 <Button type="submit">save record</Button>
  </div>
  </form>
  );
}
