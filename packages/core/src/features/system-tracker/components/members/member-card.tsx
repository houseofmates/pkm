/* eslint-disable */
import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  MoreHorizontal, 
  Edit, 
  Trash2, 
  Star, 
  Calendar,
  Tag,
  Heart,
  X
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { MemberForm } from './member-form';
import { useMembersStore } from '../../stores/members-store';
import { useFrontStore } from '../../stores/front-store';
import type { SystemMember, MemberStatus } from '../../types/schema';

interface MemberCardProps {
  member: SystemMember;
  showActions?: boolean;
  onClick?: () => void;
  className?: string;
}

const STATUS_COLORS: Record<MemberStatus, string> = {
  active: 'bg-green-500',
  dormant: 'bg-yellow-500',
  archived: 'bg-gray-500',
  fused: 'bg-purple-500'
};

export function MemberCard({ member, showActions = true, onClick, className }: MemberCardProps) {
  const { updateMember, deleteMember, setSelectedMember } = useMembersStore();
  const { activeFronters } = useFrontStore();
  
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  const isActive = activeFronters.includes(member.id);
  const statusColor = STATUS_COLORS[member.status];

  const handleEdit = () => {
    setIsEditOpen(true);
  };

  const handleDelete = async () => {
    if (confirm(`are you sure you want to delete ${member.name}? this action cannot be undone.`)) {
      await deleteMember(member.id);
    }
  };

  const handleSave = async (updatedMember: SystemMember) => {
    await updateMember(updatedMember.id, updatedMember);
    setIsEditOpen(false);
  };

  const handleCardClick = () => {
    setSelectedMember(member.id);
    onClick?.();
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <>
      <Card 
        className={`group cursor-pointer transition-all duration-200 hover:shadow-lg ${
          isActive ? 'ring-2 ring-blue-500 shadow-lg' : ''
        } ${className}`}
        onClick={handleCardClick}
      >
        <div className="relative">
          {/* Banner image */}
          {member.banner ? (
            <div className="h-24 overflow-hidden">
              <img 
                src={member.banner} 
                alt={`${member.name} banner`}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
            </div>
          ) : (
            <div className="h-24 bg-gradient-to-br from-gray-100 to-gray-200" />
          )}

          {/* Status indicator */}
          <div className={`absolute top-2 right-2 w-3 h-3 rounded-full ${statusColor} ring-2 ring-white`} />

          {/* Avatar */}
          <div className="absolute -bottom-8 left-4">
            <div 
              className="w-16 h-16 rounded-full border-4 border-white overflow-hidden bg-gray-100"
              style={{ backgroundColor: member.color }}
            >
              {member.avatar ? (
                <img 
                  src={member.avatar} 
                  alt={member.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-white font-bold text-xl">
                  {getInitials(member.name)}
                </div>
              )}
            </div>
          </div>

          {/* Actions menu */}
          {showActions && (
            <div className="absolute top-2 left-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="w-8 h-8 p-0 bg-black/20 hover:bg-black/40 text-white"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleEdit(); }}>
                    <Edit className="h-4 w-4 mr-2" />
                    edit
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setShowDetails(true); }}>
                    <Star className="h-4 w-4 mr-2" />
                    view details
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={(e) => { e.stopPropagation(); handleDelete(); }}
                    className="text-red-600"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}
        </div>

        <div className="px-4 pt-10 pb-4">
          {/* Name and display name */}
          <div className="mb-2">
            <h3 className="font-bold text-lg text-gray-900">{member.name}</h3>
            {member.displayName && member.displayName !== member.name && (
              <p className="text-sm text-gray-500 italic">{member.displayName}</p>
            )}
          </div>

          {/* Pronouns */}
          {member.pronouns && (
            <div className="mb-2">
              <span className="text-sm text-gray-600 lowercase">{member.pronouns}</span>
            </div>
          )}

          {/* Role */}
          {member.role && (
            <div className="mb-2">
              <Badge variant="secondary" className="text-xs">
                {member.role}
              </Badge>
            </div>
          )}

          {/* Tags */}
          {member.tags && member.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-2">
              {member.tags.slice(0, 3).map(tag => (
                <Badge key={tag} variant="outline" className="text-xs">
                  {tag}
                </Badge>
              ))}
              {member.tags.length > 3 && (
                <Badge variant="outline" className="text-xs">
                  +{member.tags.length - 3}
                </Badge>
              )}
            </div>
          )}

          {/* Description preview */}
          {member.description && (
            <p className="text-sm text-gray-600 line-clamp-2 lowercase">
              {member.description}
            </p>
          )}

          {/* Active indicator */}
          {isActive && (
            <div className="mt-2">
              <Badge variant="default" className="text-xs">
                currently fronting
              </Badge>
            </div>
          )}
        </div>
      </Card>

      {/* Edit dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>edit member: {member.name}</DialogTitle>
          </DialogHeader>
          <MemberForm
            member={member}
            onSave={handleSave}
            onCancel={() => setIsEditOpen(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Details dialog */}
      <Dialog open={showDetails} onOpenChange={setShowDetails}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div 
                className="w-8 h-8 rounded-full overflow-hidden bg-gray-100"
                style={{ backgroundColor: member.color }}
              >
                {member.avatar ? (
                  <img 
                    src={member.avatar} 
                    alt={member.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-white font-bold text-sm">
                    {getInitials(member.name)}
                  </div>
                )}
              </div>
              {member.name}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Basic info */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <h4 className="font-semibold text-sm text-gray-500 mb-1">display name</h4>
                <p>{member.displayName || '—'}</p>
              </div>
              <div>
                <h4 className="font-semibold text-sm text-gray-500 mb-1">pronouns</h4>
                <p>{member.pronouns || '—'}</p>
              </div>
              <div>
                <h4 className="font-semibold text-sm text-gray-500 mb-1">status</h4>
                <Badge variant="secondary">{member.status}</Badge>
              </div>
              <div>
                <h4 className="font-semibold text-sm text-gray-500 mb-1">role</h4>
                <p>{member.role || '—'}</p>
              </div>
            </div>

            {/* Description */}
            {member.description && (
              <div>
                <h4 className="font-semibold text-sm text-gray-500 mb-2">description</h4>
                <p className="text-sm lowercase">{member.description}</p>
              </div>
            )}

            {/* Personal details */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <h4 className="font-semibold text-sm text-gray-500 mb-1">age</h4>
                <p>{member.age || '—'}</p>
              </div>
              <div>
                <h4 className="font-semibold text-sm text-gray-500 mb-1">species</h4>
                <p>{member.species || '—'}</p>
              </div>
              <div>
                <h4 className="font-semibold text-sm text-gray-500 mb-1">birthdate</h4>
                <p>{member.birthdate || '—'}</p>
              </div>
              <div>
                <h4 className="font-semibold text-sm text-gray-500 mb-1">source</h4>
                <p>{member.source || '—'}</p>
              </div>
            </div>

            {/* Preferences */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <h4 className="font-semibold text-sm text-gray-500 mb-2 flex items-center gap-1">
                  <Heart className="h-4 w-4" />
                  likes
                </h4>
                <div className="flex flex-wrap gap-1">
                  {member.likes?.length ? member.likes.map(like => (
                    <Badge key={like} variant="secondary" className="text-xs">
                      {like}
                    </Badge>
                  )) : <p className="text-sm text-gray-400">none listed</p>}
                </div>
              </div>
              <div>
                <h4 className="font-semibold text-sm text-gray-500 mb-2 flex items-center gap-1">
                  <X className="h-4 w-4" />
                  dislikes
                </h4>
                <div className="flex flex-wrap gap-1">
                  {member.dislikes?.length ? member.dislikes.map(dislike => (
                    <Badge key={dislike} variant="secondary" className="text-xs">
                      {dislike}
                    </Badge>
                  )) : <p className="text-sm text-gray-400">none listed</p>}
                </div>
              </div>
            </div>

            {/* Tags */}
            {member.tags && member.tags.length > 0 && (
              <div>
                <h4 className="font-semibold text-sm text-gray-500 mb-2 flex items-center gap-1">
                  <Tag className="h-4 w-4" />
                  tags
                </h4>
                <div className="flex flex-wrap gap-1">
                  {member.tags.map(tag => (
                    <Badge key={tag} variant="outline" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Custom fields */}
            {member.customFields && member.customFields.length > 0 && (
              <div>
                <h4 className="font-semibold text-sm text-gray-500 mb-2">custom fields</h4>
                <div className="space-y-2">
                  {member.customFields.map(cf => (
                    <div key={cf.fieldId} className="text-sm">
                      <span className="font-medium">{cf.fieldId}:</span> {cf.value}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}