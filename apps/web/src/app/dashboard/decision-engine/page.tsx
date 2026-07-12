'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { 
  Brain, 
  Target, 
  Users, 
  TrendingUp, 
  AlertCircle, 
  CheckCircle,
  Activity,
  Zap
} from 'lucide-react';

export default function DecisionEnginePage() {
  const [testInput, setTestInput] = useState('');
  const [decisionResult, setDecisionResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const handleTestDecision = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/decision-engine/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationId: 'test-conversation',
          rawInput: testInput,
          sessionId: 'test-session',
          conversationMemory: {
            history: [],
            currentIntent: null,
          },
          customerContext: {},
          campaignContext: {},
        }),
      });
      const data = await response.json();
      setDecisionResult(data);
    } catch (error) {
      console.error('Error evaluating decision:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 space-y-6 p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">AI Decision Engine</h2>
          <p className="text-muted-foreground">
            The brain of your AI calling platform
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Decisions</CardTitle>
            <Brain className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">12,543</div>
            <p className="text-xs text-muted-foreground">+18% from last month</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Confidence</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">87.3%</div>
            <p className="text-xs text-muted-foreground">+5.2% from last month</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Hot Leads</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">342</div>
            <p className="text-xs text-muted-foreground">+12% from last month</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Fallback Rate</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">8.2%</div>
            <p className="text-xs text-muted-foreground">-3.1% from last month</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="test" className="space-y-4">
        <TabsList>
          <TabsTrigger value="test">Test Decision</TabsTrigger>
          <TabsTrigger value="intents">Intents</TabsTrigger>
          <TabsTrigger value="entities">Entities</TabsTrigger>
          <TabsTrigger value="rules">Business Rules</TabsTrigger>
          <TabsTrigger value="leads">Lead Qualification</TabsTrigger>
        </TabsList>

        <TabsContent value="test" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Test Decision Engine</CardTitle>
              <CardDescription>
                Enter a customer response to see how the decision engine processes it
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="testInput">Customer Input</Label>
                <Textarea
                  id="testInput"
                  placeholder="Enter customer response, e.g., 'Yes, I'm interested in a 3 BHK apartment in Mumbai around 1 crore'"
                  value={testInput}
                  onChange={(e) => setTestInput(e.target.value)}
                  rows={4}
                />
              </div>
              <Button onClick={handleTestDecision} disabled={loading || !testInput}>
                {loading ? 'Processing...' : 'Evaluate Decision'}
              </Button>

              {decisionResult && (
                <div className="mt-6 space-y-4">
                  <div className="grid gap-4 md:grid-cols-3">
                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-medium">Detected Intent</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <Badge variant="outline" className="text-base">
                          {decisionResult.detectedIntent}
                        </Badge>
                        <p className="text-xs text-muted-foreground mt-2">
                          Confidence: {(decisionResult.intentConfidence * 100).toFixed(1)}%
                        </p>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-medium">Conversation Action</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <Badge variant="default" className="text-base">
                          {decisionResult.conversationAction}
                        </Badge>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-medium">Lead Qualification</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <Badge 
                          variant={
                            decisionResult.leadQualification === 'HOT_LEAD' ? 'destructive' :
                            decisionResult.leadQualification === 'WARM_LEAD' ? 'default' :
                            'secondary'
                          }
                          className="text-base"
                        >
                          {decisionResult.leadQualification}
                        </Badge>
                      </CardContent>
                    </Card>
                  </div>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm font-medium">Extracted Entities</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-wrap gap-2">
                        {decisionResult.extractedEntities?.map((entity: any, idx: number) => (
                          <Badge key={idx} variant="outline">
                            {entity.entityType}: {entity.entityValue}
                          </Badge>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm font-medium">Confidence Scores</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {Object.entries(decisionResult.confidenceScores || {}).map(([key, value]: [string, any]) => (
                          <div key={key} className="flex items-center justify-between">
                            <span className="text-sm capitalize">{key}</span>
                            <div className="flex items-center gap-2">
                              <div className="w-32 h-2 bg-secondary rounded-full overflow-hidden">
                                <div 
                                  className="h-full bg-primary"
                                  style={{ width: `${value * 100}%` }}
                                />
                              </div>
                              <span className="text-sm font-medium w-12 text-right">
                                {(value * 100).toFixed(0)}%
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm font-medium">Decision Reason</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground">
                        {decisionResult.decisionReason}
                      </p>
                    </CardContent>
                  </Card>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="intents" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Intent Distribution</CardTitle>
              <CardDescription>Overview of detected intents across conversations</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[
                  { intent: 'INTERESTED', count: 3421, percentage: 35, color: 'bg-green-500' },
                  { intent: 'NEED_PRICING', count: 2156, percentage: 22, color: 'bg-blue-500' },
                  { intent: 'NEED_DETAILS', count: 1875, percentage: 19, color: 'bg-purple-500' },
                  { intent: 'CALL_BACK_LATER', count: 1234, percentage: 13, color: 'bg-yellow-500' },
                  { intent: 'NOT_INTERESTED', count: 1089, percentage: 11, color: 'bg-red-500' },
                ].map((item) => (
                  <div key={item.intent} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">{item.intent}</span>
                      <span className="text-sm text-muted-foreground">
                        {item.count} ({item.percentage}%)
                      </span>
                    </div>
                    <div className="w-full h-2 bg-secondary rounded-full overflow-hidden">
                      <div 
                        className={`h-full ${item.color}`}
                        style={{ width: `${item.percentage}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="entities" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Entity Extraction Statistics</CardTitle>
              <CardDescription>Most commonly extracted entities</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[
                  { entity: 'BUDGET', count: 4523, confidence: 0.89 },
                  { entity: 'CITY', count: 4312, confidence: 0.93 },
                  { entity: 'PROPERTY_TYPE', count: 3987, confidence: 0.85 },
                  { entity: 'PURCHASE_TIMELINE', count: 2145, confidence: 0.78 },
                  { entity: 'CUSTOMER_NAME', count: 1876, confidence: 0.92 },
                ].map((item) => (
                  <div key={item.entity} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="space-y-1">
                      <p className="text-sm font-medium">{item.entity}</p>
                      <p className="text-xs text-muted-foreground">
                        Extracted {item.count} times
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold">{(item.confidence * 100).toFixed(0)}%</p>
                      <p className="text-xs text-muted-foreground">Avg Confidence</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="rules" className="space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-lg font-medium">Business Rules</h3>
              <p className="text-sm text-muted-foreground">
                Configure rules to control decision logic
              </p>
            </div>
            <Button>Create Rule</Button>
          </div>

          <div className="grid gap-4">
            {[
              { 
                name: 'Budget Qualification Rule', 
                type: 'LEAD_QUALIFICATION', 
                priority: 10,
                active: true,
                executions: 1234
              },
              { 
                name: 'Business Hours Only', 
                type: 'CONVERSATION_LIMIT', 
                priority: 9,
                active: true,
                executions: 5678
              },
              { 
                name: 'Language Preference', 
                type: 'LANGUAGE_RULE', 
                priority: 8,
                active: true,
                executions: 3456
              },
            ].map((rule, idx) => (
              <Card key={idx}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <CardTitle className="text-base">{rule.name}</CardTitle>
                      <CardDescription>{rule.type}</CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      {rule.active ? (
                        <Badge variant="default">Active</Badge>
                      ) : (
                        <Badge variant="secondary">Inactive</Badge>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Priority: {rule.priority}</span>
                    <span className="text-muted-foreground">{rule.executions} executions</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="leads" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Lead Qualification Overview</CardTitle>
              <CardDescription>Distribution of lead quality scores</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-3">
                <Card className="border-red-200 bg-red-50">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <Zap className="h-4 w-4 text-red-600" />
                      Hot Leads
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-red-600">342</div>
                    <p className="text-xs text-muted-foreground mt-1">28% of total</p>
                  </CardContent>
                </Card>

                <Card className="border-orange-200 bg-orange-50">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <Activity className="h-4 w-4 text-orange-600" />
                      Warm Leads
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-orange-600">567</div>
                    <p className="text-xs text-muted-foreground mt-1">46% of total</p>
                  </CardContent>
                </Card>

                <Card className="border-blue-200 bg-blue-50">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <Users className="h-4 w-4 text-blue-600" />
                      Cold Leads
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-blue-600">321</div>
                    <p className="text-xs text-muted-foreground mt-1">26% of total</p>
                  </CardContent>
                </Card>
              </div>

              <div className="mt-6 space-y-3">
                <h4 className="text-sm font-medium">Recent Qualified Leads</h4>
                {[
                  { name: 'John Doe', qualification: 'HOT_LEAD', score: 92, timestamp: '2 mins ago' },
                  { name: 'Jane Smith', qualification: 'WARM_LEAD', score: 78, timestamp: '5 mins ago' },
                  { name: 'Bob Johnson', qualification: 'HOT_LEAD', score: 88, timestamp: '8 mins ago' },
                ].map((lead, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="space-y-1">
                      <p className="text-sm font-medium">{lead.name}</p>
                      <p className="text-xs text-muted-foreground">{lead.timestamp}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <p className="text-sm font-bold">{lead.score}</p>
                        <p className="text-xs text-muted-foreground">Score</p>
                      </div>
                      <Badge 
                        variant={lead.qualification === 'HOT_LEAD' ? 'destructive' : 'default'}
                      >
                        {lead.qualification}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
