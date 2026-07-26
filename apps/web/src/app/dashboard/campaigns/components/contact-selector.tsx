'use client';

import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search, Users, ChevronLeft, ChevronRight, X, Upload, FileUp } from 'lucide-react';
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
  const [uploading, setUploading] = useState(false);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<'select' | 'import'>('select');
  const fileInputRef = useRef<HTMLInputElement>(null);
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
        search,
        status: 'ACTIVE',
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
    if (activeTab === 'select') {
      loadContacts();
    }
  }, [pagination.page, search, activeTab]);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const validExtensions = ['.csv', '.xlsx', '.xls'];
    const fileExtension = file.name.toLowerCase().slice(file.name.lastIndexOf('.'));
    
    if (!validExtensions.includes(fileExtension)) {
      toast({
        title: 'Invalid File',
        description: 'Please upload a CSV or Excel file (.csv, .xlsx, .xls)',
        variant: 'destructive',
      });
      return;
    }

    try {
      setUploading(true);
      const formData = new FormData();
      formData.append('file', file);

      const response = await contactApi.import(formData);
      const importResult = response.data.data;
      const duplicates = (importResult as any).duplicates || 0;

      toast({
        title: 'Import Successful',
        description: `Imported ${importResult.imported} contacts. ${duplicates} duplicates skipped.`,
      });

      // Reload contacts and auto-select the newly imported ones
      await loadContacts();
      
      // Switch back to select tab to show the imported contacts
      setActiveTab('select');
      
      // Note: We cannot automatically select the newly imported contacts
      // because the import API doesn't return the IDs of imported contacts.
      // User will need to manually select them or we'd need to enhance the backend.
      
    } catch (error: any) {
      toast({
        title: 'Import Failed',
        description: error.response?.data?.message || 'Failed to import contacts',
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

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
            <CardTitle className="text-lg">Assigned Contacts</CardTitle>
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
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'select' | 'import')}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="select">Select Existing</TabsTrigger>
            <TabsTrigger value="import">Import Contacts</TabsTrigger>
          </TabsList>

          <TabsContent value="select" className="space-y-4 mt-4">
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
                          {contact.company && <span className="truncate">• {contact.company}</span>}
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
          </TabsContent>

          <TabsContent value="import" className="space-y-4 mt-4">
            <div className="space-y-4">
              <div className="text-sm text-muted-foreground">
                Import contacts from CSV or Excel files. After successful import, 
                switch to the "Select Existing" tab to assign the imported contacts to this campaign.
              </div>

              {/* File Upload Area */}
              <div className="border-2 border-dashed rounded-lg p-8 text-center space-y-4">
                <div className="flex justify-center">
                  <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                    <Upload className="h-6 w-6 text-primary" />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <h3 className="font-medium">Upload Contact File</h3>
                  <p className="text-sm text-muted-foreground">
                    Supported formats: CSV, Excel (.xlsx, .xls)
                  </p>
                </div>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  onChange={handleFileUpload}
                  className="hidden"
                  disabled={uploading}
                />

                <Button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  size="lg"
                >
                  {uploading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <FileUp className="mr-2 h-4 w-4" />
                      Choose File
                    </>
                  )}
                </Button>
              </div>

              {/* Template Download */}
              <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/50">
                <div className="space-y-1">
                  <div className="font-medium text-sm">Need a template?</div>
                  <div className="text-xs text-muted-foreground">
                    Download our CSV template with sample data and formatting guidelines
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    window.open(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1'}/contacts/template`, '_blank');
                  }}
                >
                  Download Template
                </Button>
              </div>

              {/* Instructions */}
              <div className="space-y-2 text-sm text-muted-foreground">
                <div className="font-medium text-foreground">Import Instructions:</div>
                <ul className="list-disc list-inside space-y-1 ml-2">
                  <li>Ensure your file includes required columns: firstName, lastName, phone</li>
                  <li>Phone numbers should include country code (e.g., +1234567890)</li>
                  <li>Duplicate phone numbers will be automatically detected and skipped</li>
                  <li>Invalid rows will be reported after import</li>
                  <li>Maximum file size: 10MB</li>
                </ul>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
