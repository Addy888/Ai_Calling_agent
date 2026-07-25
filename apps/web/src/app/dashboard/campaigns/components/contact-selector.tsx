'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Search, Users, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { contactApi } from '@/lib/api';
import { Contact } from '@/types';
import { toast } from '@/components/ui/use-toast';

interface ContactSelectorProps {
  selectedContactIds: string[];
  onSelectionChange: (contactIds: string[]) => void;
  campaignId?: string; // For edit mode, to exclude already assigned
}

export function ContactSelector({
  selectedContactIds,
  onSelectionChange,
  campaignId,
}: ContactSelectorProps) {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });

  const loadContacts = async () => {
    try {
      setLoading(true);
      const response = await contactApi.getAll({
        page: pagination.page,
        limit: pagination.limit,
        filters: {
          search,
          status: ['ACTIVE'],
          // Optionally exclude contacts already in this campaign when editing
        },
      });
      setContacts(response.data.data.items);
      setPagination(prev => ({
        ...prev,
        total: response.data.data.meta.total,
        totalPages: response.data.data.meta.totalPages,
      }));
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load contacts',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadContacts();
  }, [pagination.page, search]);

  const handleSelectAll = () => {
    const currentPageContactIds = contacts.map(c => c.id);
    const allSelected = currentPageContactIds.every(id =>
      selectedContactIds.includes(id),
    );

    if (allSelected) {
      // Deselect all on current page
      onSelectionChange(
        selectedContactIds.filter(id => !currentPageContactIds.includes(id)),
      );
    } else {
      // Select all on current page
      const newSelection = [
        ...selectedContactIds,
        ...currentPageContactIds.filter(id => !selectedContactIds.includes(id)),
      ];
      onSelectionChange(newSelection);
    }
  };

  const handleSelectContact = (contactId: string) => {
    if (selectedContactIds.includes(contactId)) {
      onSelectionChange(selectedContactIds.filter(id => id !== contactId));
    } else {
      onSelectionChange([...selectedContactIds, contactId]);
    }
  };

  const handleClearSelection = () => {
    onSelectionChange([]);
  };

  const isAllSelected = contacts.length > 0 && contacts.every(c => selectedContactIds.includes(c.id));
  const isSomeSelected = contacts.some(c => selectedContactIds.includes(c.id)) && !isAllSelected;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            <CardTitle className="text-lg">Select Contacts</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            {selectedContactIds.length > 0 && (
              <>
                <Badge variant="secondary" className="px-3 py-1">
                  {selectedContactIds.length} selected
                </Badge>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleClearSelection}
                  className="h-8"
                >
                  <X className="h-4 w-4 mr-1" />
                  Clear
                </Button>
              </>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search contacts by name or phone..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPagination(prev => ({ ...prev, page: 1 }));
            }}
            className="pl-10"
          />
        </div>

        {/* Select All */}
        {contacts.length > 0 && (
          <div className="flex items-center space-x-2 p-3 border rounded-md bg-muted/50">
            <Checkbox
              id="select-all"
              checked={isAllSelected}
              ref={(el) => {
                if (el) {
                  (el as any).indeterminate = isSomeSelected;
                }
              }}
              onCheckedChange={handleSelectAll}
            />
            <label
              htmlFor="select-all"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
            >
              {isAllSelected
                ? 'Deselect all on this page'
                : isSomeSelected
                ? `Select all ${contacts.length} contacts on this page`
                : `Select all ${contacts.length} contacts on this page`}
            </label>
          </div>
        )}

        {/* Contact List */}
        <div className="space-y-2 max-h-[400px] overflow-y-auto">
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">
              Loading contacts...
            </div>
          ) : contacts.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {search ? 'No contacts found matching your search' : 'No contacts available'}
            </div>
          ) : (
            contacts.map((contact) => {
              const isSelected = selectedContactIds.includes(contact.id);
              return (
                <div
                  key={contact.id}
                  className={`flex items-center space-x-3 p-3 border rounded-md cursor-pointer transition-colors ${
                    isSelected
                      ? 'bg-primary/10 border-primary'
                      : 'hover:bg-muted/50'
                  }`}
                  onClick={() => handleSelectContact(contact.id)}
                >
                  <Checkbox
                    id={`contact-${contact.id}`}
                    checked={isSelected}
                    onCheckedChange={() => handleSelectContact(contact.id)}
                    onClick={(e) => e.stopPropagation()}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium truncate">
                        {contact.fullName || `${contact.firstName} ${contact.lastName}`}
                      </span>
                      <Badge variant="outline" className="text-xs">
                        {contact.status}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
                      <span>{contact.phone}</span>
                      {contact.email && <span className="truncate">{contact.email}</span>}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-between pt-2 border-t">
            <div className="text-sm text-muted-foreground">
              Showing {((pagination.page - 1) * pagination.limit) + 1} to{' '}
              {Math.min(pagination.page * pagination.limit, pagination.total)} of{' '}
              {pagination.total} contacts
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                disabled={pagination.page === 1 || loading}
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Previous
              </Button>
              <span className="text-sm">
                Page {pagination.page} of {pagination.totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                disabled={pagination.page >= pagination.totalPages || loading}
              >
                Next
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
