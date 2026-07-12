'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useRouter, useParams } from 'next/navigation';
import { ArrowLeft, Edit, Mail, Phone, MapPin, Building, Globe, Clock, Tag } from 'lucide-react';
import Link from 'next/link';

export default function ContactDetailsPage() {
  const { id } = useParams();
  const { toast } = useToast();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [contact, setContact] = useState<any>(null);

  useEffect(() => {
    const fetchContact = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/contacts/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (data.success) {
          setContact(data.data);
        } else {
          toast({ title: 'Contact not found', variant: 'destructive' });
          router.push('/dashboard/contacts');
        }
      } catch (error) {
        toast({ title: 'Failed to fetch contact details', variant: 'destructive' });
      } finally {
        setLoading(false);
      }
    };
    fetchContact();
  }, [id]);

  if (loading) {
    return <div className="p-8 text-center text-muted-foreground">Loading contact details...</div>;
  }

  if (!contact) return null;

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-10">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/dashboard/contacts">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-2xl font-bold text-primary">
              {contact.firstName?.[0]}{contact.lastName?.[0]}
            </div>
            <div>
              <h2 className="text-3xl font-bold tracking-tight">{contact.fullName}</h2>
              <p className="text-muted-foreground">
                {contact.designation && `${contact.designation} at `}{contact.company || 'No Company'}
              </p>
            </div>
          </div>
        </div>
        <Button asChild>
          <Link href={`/dashboard/contacts/${contact.id}/edit`}>
            <Edit className="mr-2 h-4 w-4" />
            Edit Contact
          </Link>
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-1 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Contact Info</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <span>{contact.countryCode} {contact.phone}</span>
              </div>
              {contact.email && (
                <div className="flex items-center gap-3">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span>{contact.email}</span>
                </div>
              )}
              {contact.language && (
                <div className="flex items-center gap-3">
                  <Globe className="h-4 w-4 text-muted-foreground" />
                  <span className="uppercase">{contact.language}</span>
                </div>
              )}
              <div className="flex items-center gap-3">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <span>
                  {[contact.city, contact.state, contact.country].filter(Boolean).join(', ') || 'No location provided'}
                </span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Company Info</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <Building className="h-4 w-4 text-muted-foreground" />
                <span>{contact.company || 'N/A'}</span>
              </div>
              <div className="flex items-center gap-3">
                <Tag className="h-4 w-4 text-muted-foreground" />
                <div className="flex flex-wrap gap-2">
                  {contact.tags && contact.tags.length > 0 ? (
                    contact.tags.map((tag: string, index: number) => (
                      <span key={index} className="px-2 py-1 bg-secondary text-secondary-foreground text-xs rounded-full">
                        {tag}
                      </span>
                    ))
                  ) : (
                    <span className="text-muted-foreground">No tags</span>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="md:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Notes</CardTitle>
            </CardHeader>
            <CardContent>
              {contact.notes ? (
                <p className="whitespace-pre-wrap text-sm">{contact.notes}</p>
              ) : (
                <p className="text-muted-foreground italic text-sm">No notes provided for this contact.</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Recent Activity & Campaign History</CardTitle>
              <CardDescription>View calls and campaign interactions</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center p-8 border border-dashed rounded-lg">
                <Clock className="mx-auto h-8 w-8 text-muted-foreground mb-4" />
                <h3 className="font-semibold text-lg mb-1">No Recent Activity</h3>
                <p className="text-sm text-muted-foreground">
                  This contact has not been contacted in any campaigns yet.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
