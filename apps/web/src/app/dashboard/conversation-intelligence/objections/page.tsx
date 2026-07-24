'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, CheckCircle2, XCircle } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

export default function ObjectionsPage() {
  const [objections, setObjections] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchObjections();
  }, []);

  const fetchObjections = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        '/api/v1/conversation-intelligence/analytics/objection-distribution',
        {
          headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` },
        }
      );
      const data = await response.json();
      setObjections(data || []);
    } catch (error) {
      console.error('Error fetching objections:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <AlertCircle className="h-8 w-8 text-orange-600" />
          Objection Analysis
        </h1>
        <p className="text-muted-foreground mt-1">
          Customer objections and resolution strategies
        </p>
      </div>

      {loading ? (
        <div className="text-center py-12">Loading objections...</div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {objections.length === 0 ? (
            <Card>
              <CardContent className="pt-6">
                <p className="text-center text-muted-foreground">No objections data available</p>
              </CardContent>
            </Card>
          ) : (
            objections.map((objection, index) => (
              <Card key={index}>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <AlertCircle className="h-5 w-5 text-orange-600" />
                      {objection.objectionType.replace(/_/g, ' ')}
                    </span>
                    <Badge variant="outline">
                      {objection.count} occurrences
                    </Badge>
                  </CardTitle>
                  <CardDescription>
                    Resolution analysis and effectiveness
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Total Objections</p>
                      <p className="text-2xl font-bold">{objection.count}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Resolved</p>
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-5 w-5 text-green-600" />
                        <p className="text-2xl font-bold">{objection.resolvedCount}</p>
                      </div>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Unresolved</p>
                      <div className="flex items-center gap-2">
                        <XCircle className="h-5 w-5 text-red-600" />
                        <p className="text-2xl font-bold">
                          {objection.count - objection.resolvedCount}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm font-medium">Resolution Rate</p>
                      <p className="text-sm font-bold">{objection.resolutionRate.toFixed(1)}%</p>
                    </div>
                    <Progress value={objection.resolutionRate} />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm font-medium">Average Resolution Score</p>
                      <p className="text-sm font-bold">
                        {objection.averageResolutionScore.toFixed(1)}
                      </p>
                    </div>
                    <Progress value={objection.averageResolutionScore} />
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}
    </div>
  );
}
