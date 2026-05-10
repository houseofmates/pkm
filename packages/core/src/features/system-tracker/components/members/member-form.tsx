/* eslint-disable */
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { X, Plus, Upload, Palette } from 'lucide-react';
import { useMembersStore } from '../../stores/members-store';
import type { SystemMember, CustomFieldDefinition, CustomFieldType, MemberStatus } from '../../types/schema';

interface MemberFormProps {
  member?: SystemMember;
  onSave: (member: SystemMember) => void;
  onCancel: () => void;
}

const STATUS_OPTIONS: { value: MemberStatus; label: string }[] = [
  { value: 'active', label: 'active' },
  { value: 'dormant', label: 'dormant' },
  { value: 'archived', label: 'archived' },
  { value: 'fused', label: 'fused/integrated' }
];

const FIELD_TYPES: { value: CustomFieldType; label: string }[] = [
  { value: 'text', label: 'text' },
  { value: 'textarea', label: 'textarea' },
  { value: 'number', label: 'number' },
  { value: 'date', label: 'date' },
  { value: 'boolean', label: 'yes/no' },
  { value: 'url', label: 'url' },
  { value: 'select', label: 'dropdown' },
  { value: 'multiselect', label: 'multi-select' },
  { value: 'color', label: 'color' }
];

export function MemberForm({ member, onSave, onCancel }: MemberFormProps) {
  const { customFields, addCustomField, updateCustomField } = useMembersStore();
  
  const [formData, setFormData] = useState<Partial<SystemMember>>({
    name: '',
    displayName: '',
    pronouns: '',
    avatar: '',
    banner: '',
    color: '#3b82f6',
    description: '',
    birthdate: '',
    role: '',
    source: '',
    sourceLink: '',
    species: '',
    age: '',
    likes: [],
    dislikes: [],
    customFields: [],
    status: 'active',
    tags: [],
    ...member
  });

  const [newTag, setNewTag] = useState('');
  const [newLike, setNewLike] = useState('');
  const [newDislike, setNewDislike] = useState('');
  const [avatarPreview, setAvatarPreview] = useState<string>('');
  const [bannerPreview, setBannerPreview] = useState<string>('');

  useEffect(() => {
    if (member?.avatar) {
      setAvatarPreview(member.avatar);
    }
    if (member?.banner) {
      setBannerPreview(member.banner);
    }
  }, [member]);

  const handleInputChange = (field: keyof SystemMember, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleCustomFieldChange = (fieldId: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      customFields: prev.customFields?.map(cf => 
        cf.fieldId === fieldId ? { ...cf, value } : cf
      ) || [{ fieldId, value }]
    }));
  };

  const handleAvatarUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        setAvatarPreview(result);
        handleInputChange('avatar', result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleBannerUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        setBannerPreview(result);
        handleInputChange('banner', result);
      };
      reader.readAsDataURL(file);
    }
  };

  const addTag = () => {
    if (newTag.trim() && !formData.tags?.includes(newTag.trim())) {
      handleInputChange('tags', [...(formData.tags || []), newTag.trim()]);
      setNewTag('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    handleInputChange('tags', formData.tags?.filter(tag => tag !== tagToRemove) || []);
  };

  const addLike = () => {
    if (newLike.trim() && !formData.likes?.includes(newLike.trim())) {
      handleInputChange('likes', [...(formData.likes || []), newLike.trim()]);
      setNewLike('');
    }
  };

  const removeLike = (likeToRemove: string) => {
    handleInputChange('likes', formData.likes?.filter(like => like !== likeToRemove) || []);
  };

  const addDislike = () => {
    if (newDislike.trim() && !formData.dislikes?.includes(newDislike.trim())) {
      handleInputChange('dislikes', [...(formData.dislikes || []), newDislike.trim()]);
      setNewDislike('');
    }
  };

  const removeDislike = (dislikeToRemove: string) => {
    handleInputChange('dislikes', formData.dislikes?.filter(dislike => dislike !== dislikeToRemove) || []);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name?.trim()) return;

    const memberData: SystemMember = {
      id: member?.id || crypto.randomUUID(),
      name: formData.name.trim(),
      displayName: formData.displayName?.trim() || undefined,
      pronouns: formData.pronouns?.trim() || undefined,
      avatar: formData.avatar || undefined,
      banner: formData.banner || undefined,
      color: formData.color || '#3b82f6',
      description: formData.description?.trim() || undefined,
      birthdate: formData.birthdate || undefined,
      role: formData.role?.trim() || undefined,
      source: formData.source?.trim() || undefined,
      sourceLink: formData.sourceLink?.trim() || undefined,
      species: formData.species?.trim() || undefined,
      age: formData.age?.trim() || undefined,
      likes: formData.likes || [],
      dislikes: formData.dislikes || [],
      customFields: formData.customFields || [],
      status: formData.status || 'active',
      tags: formData.tags || [],
      createdAt: member?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    onSave(memberData);
  };

  const renderCustomField = (field: CustomFieldDefinition) => {
    const currentValue = formData.customFields?.find(cf => cf.fieldId === field.id)?.value;
    
    switch (field.type) {
      case 'text':
        return (
          <Input
            value={currentValue || ''}
            onChange={(e) => handleCustomFieldChange(field.id, e.target.value)}
            placeholder={field.description || `enter ${field.name}`}
          />
        );
      
      case 'textarea':
        return (
          <Textarea
            value={currentValue || ''}
            onChange={(e) => handleCustomFieldChange(field.id, e.target.value)}
            placeholder={field.description || `enter ${field.name}`}
            rows={3}
          />
        );
      
      case 'number':
        return (
          <Input
            type="number"
            value={currentValue || ''}
            onChange={(e) => handleCustomFieldChange(field.id, Number(e.target.value) || null)}
            placeholder={field.description || `enter ${field.name}`}
          />
        );
      
      case 'date':
        return (
          <Input
            type="date"
            value={currentValue || ''}
            onChange={(e) => handleCustomFieldChange(field.id, e.target.value)}
          />
        );
      
      case 'boolean':
        return (
          <Select
            value={currentValue?.toString() || ''}
            onValueChange={(value) => handleCustomFieldChange(field.id, value === 'true')}
          >
            <SelectTrigger>
              <SelectValue placeholder="select..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="true">yes</SelectItem>
              <SelectItem value="false">no</SelectItem>
            </SelectContent>
          </Select>
        );
      
      case 'url':
        return (
          <Input
            type="url"
            value={currentValue || ''}
            onChange={(e) => handleCustomFieldChange(field.id, e.target.value)}
            placeholder={field.description || `https://...`}
          />
        );
      
      case 'color':
        return (
          <div className="flex gap-2">
            <Input
              type="color"
              value={currentValue || '#000000'}
              onChange={(e) => handleCustomFieldChange(field.id, e.target.value)}
              className="w-16 h-10"
            />
            <Input
              value={currentValue || ''}
              onChange={(e) => handleCustomFieldChange(field.id, e.target.value)}
              placeholder="#000000"
              className="flex-1"
            />
          </div>
        );
      
      case 'select':
        return (
          <Select
            value={currentValue || ''}
            onValueChange={(value) => handleCustomFieldChange(field.id, value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="select..." />
            </SelectTrigger>
            <SelectContent>
              {field.options?.map(option => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );
      
      case 'multiselect':
        return (
          <div className="space-y-2">
            <div className="flex flex-wrap gap-1">
              {Array.isArray(currentValue) && currentValue.map((item: string) => (
                <Badge key={item} variant="secondary" className="gap-1">
                  {item}
                  <X 
                    className="h-3 w-3 cursor-pointer" 
                    onClick={() => {
                      const updated = currentValue.filter((i: string) => i !== item);
                      handleCustomFieldChange(field.id, updated);
                    }}
                  />
                </Badge>
              ))}
            </div>
            <Select
              value=""
              onValueChange={(value) => {
                const current = Array.isArray(currentValue) ? currentValue : [];
                if (!current.includes(value)) {
                  handleCustomFieldChange(field.id, [...current, value]);
                }
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="add option..." />
              </SelectTrigger>
              <SelectContent>
                {field.options?.map(option => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        );
      
      default:
        return (
          <Input
            value={currentValue || ''}
            onChange={(e) => handleCustomFieldChange(field.id, e.target.value)}
            placeholder={field.description || `enter ${field.name}`}
          />
        );
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>basic information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="name">name *</Label>
              <Input
                id="name"
                value={formData.name || ''}
                onChange={(e) => handleInputChange('name', e.target.value)}
                placeholder="member name"
                required
              />
            </div>
            
            <div>
              <Label htmlFor="displayName">display name</Label>
              <Input
                id="displayName"
                value={formData.displayName || ''}
                onChange={(e) => handleInputChange('displayName', e.target.value)}
                placeholder="alternate display name"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="pronouns">pronouns</Label>
              <Input
                id="pronouns"
                value={formData.pronouns || ''}
                onChange={(e) => handleInputChange('pronouns', e.target.value)}
                placeholder="they/them, she/her, etc."
              />
            </div>
            
            <div>
              <Label htmlFor="status">status</Label>
              <Select
                value={formData.status || 'active'}
                onValueChange={(value: MemberStatus) => handleInputChange('status', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map(option => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label htmlFor="description">description</Label>
            <Textarea
              id="description"
              value={formData.description || ''}
              onChange={(e) => handleInputChange('description', e.target.value)}
              placeholder="member description, bio, or notes"
              rows={4}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Palette className="h-4 w-4" />
            appearance
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="color">accent color</Label>
              <div className="flex gap-2">
                <Input
                  type="color"
                  id="color"
                  value={formData.color || '#3b82f6'}
                  onChange={(e) => handleInputChange('color', e.target.value)}
                  className="w-16 h-10"
                />
                <Input
                  value={formData.color || '#3b82f6'}
                  onChange={(e) => handleInputChange('color', e.target.value)}
                  placeholder="#3b82f6"
                  className="flex-1"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="avatar">avatar</Label>
              <div className="flex gap-2">
                <Input
                  type="file"
                  id="avatar"
                  accept="image/*"
                  onChange={handleAvatarUpload}
                  className="hidden"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => document.getElementById('avatar')?.click()}
                  className="gap-2"
                >
                  <Upload className="h-4 w-4" />
                  upload avatar
                </Button>
                {avatarPreview && (
                  <div className="w-10 h-10 rounded-full overflow-hidden border">
                    <img src={avatarPreview} alt="avatar preview" className="w-full h-full object-cover" />
                  </div>
                )}
              </div>
            </div>

            <div>
              <Label htmlFor="banner">banner</Label>
              <div className="flex gap-2">
                <Input
                  type="file"
                  id="banner"
                  accept="image/*"
                  onChange={handleBannerUpload}
                  className="hidden"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => document.getElementById('banner')?.click()}
                  className="gap-2"
                >
                  <Upload className="h-4 w-4" />
                  upload banner
                </Button>
                {bannerPreview && (
                  <div className="w-10 h-10 rounded overflow-hidden border">
                    <img src={bannerPreview} alt="banner preview" className="w-full h-full object-cover" />
                  </div>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="birthdate">birthdate</Label>
              <Input
                id="birthdate"
                type="date"
                value={formData.birthdate || ''}
                onChange={(e) => handleInputChange('birthdate', e.target.value)}
              />
            </div>
            
            <div>
              <Label htmlFor="age">perceived age</Label>
              <Input
                id="age"
                value={formData.age || ''}
                onChange={(e) => handleInputChange('age', e.target.value)}
                placeholder="e.g., 'teenager', 'adult', '8 years old'"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="role">role/title</Label>
              <Input
                id="role"
                value={formData.role || ''}
                onChange={(e) => handleInputChange('role', e.target.value)}
                placeholder="protector, host, gatekeeper, etc."
              />
            </div>
            
            <div>
              <Label htmlFor="species">species/type</Label>
              <Input
                id="species"
                value={formData.species || ''}
                onChange={(e) => handleInputChange('species', e.target.value)}
                placeholder="human, elf, robot, etc."
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="source">source (for introjects/fictives)</Label>
              <Input
                id="source"
                value={formData.source || ''}
                onChange={(e) => handleInputChange('source', e.target.value)}
                placeholder="media source"
              />
            </div>
            
            <div>
              <Label htmlFor="sourceLink">source link</Label>
              <Input
                id="sourceLink"
                type="url"
                value={formData.sourceLink || ''}
                onChange={(e) => handleInputChange('sourceLink', e.target.value)}
                placeholder="https://..."
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>preferences</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>likes</Label>
            <div className="flex gap-2 mb-2">
              <Input
                value={newLike}
                onChange={(e) => setNewLike(e.target.value)}
                placeholder="add something they like"
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addLike())}
              />
              <Button type="button" onClick={addLike} size="sm">
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex flex-wrap gap-1">
              {formData.likes?.map(like => (
                <Badge key={like} variant="secondary" className="gap-1">
                  {like}
                  <X className="h-3 w-3 cursor-pointer" onClick={() => removeLike(like)} />
                </Badge>
              ))}
            </div>
          </div>

          <div>
            <Label>dislikes</Label>
            <div className="flex gap-2 mb-2">
              <Input
                value={newDislike}
                onChange={(e) => setNewDislike(e.target.value)}
                placeholder="add something they dislike"
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addDislike())}
              />
              <Button type="button" onClick={addDislike} size="sm">
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex flex-wrap gap-1">
              {formData.dislikes?.map(dislike => (
                <Badge key={dislike} variant="secondary" className="gap-1">
                  {dislike}
                  <X className="h-3 w-3 cursor-pointer" onClick={() => removeDislike(dislike)} />
                </Badge>
              ))}
            </div>
          </div>

          <div>
            <Label>tags</Label>
            <div className="flex gap-2 mb-2">
              <Input
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                placeholder="add a tag"
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
              />
              <Button type="button" onClick={addTag} size="sm">
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex flex-wrap gap-1">
              {formData.tags?.map(tag => (
                <Badge key={tag} variant="outline" className="gap-1">
                  {tag}
                  <X className="h-3 w-3 cursor-pointer" onClick={() => removeTag(tag)} />
                </Badge>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {customFields.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>custom fields</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {customFields.map(field => (
              <div key={field.id}>
                <Label htmlFor={field.id}>
                  {field.name}
                  {field.required && <span className="text-red-500 ml-1">*</span>}
                </Label>
                {renderCustomField(field)}
                {field.description && (
                  <p className="text-xs text-muted-foreground mt-1">{field.description}</p>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <div className="flex gap-2 justify-end">
        <Button type="button" variant="outline" onClick={onCancel}>
          cancel
        </Button>
        <Button type="submit" disabled={!formData.name?.trim()}>
          {member ? 'update' : 'create'} member
        </Button>
      </div>
    </form>
  );
}