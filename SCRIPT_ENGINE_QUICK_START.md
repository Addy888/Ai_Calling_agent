# Script Execution Engine - Quick Start Guide

## Creating Your First Script Flow

### Step 1: Create a Script Version

```typescript
POST /api/v1/script-engine/versions
{
  "scriptId": "uuid-of-existing-script",
  "version": "1.0.0",
  "description": "Real estate lead qualification script"
}
```

### Step 2: Add Nodes

#### Start Node
```typescript
POST /api/v1/script-engine/nodes
{
  "versionId": "version-uuid",
  "nodeId": "start_1",
  "type": "START",
  "name": "Greeting",
  "content": "Hello! I'm calling from {{companyName}}. Am I speaking with {{customerName}}?",
  "isEntryPoint": true,
  "order": 0
}
```

#### Question Node
```typescript
POST /api/v1/script-engine/nodes
{
  "versionId": "version-uuid",
  "nodeId": "question_1",
  "type": "QUESTION",
  "name": "Ask Interest",
  "content": "We have exciting residential projects in {{city}}. Would you be interested in learning more?",
  "config": {
    "variableName": "interested"
  },
  "order": 1
}
```

#### Condition Node
```typescript
POST /api/v1/script-engine/nodes
{
  "versionId": "version-uuid",
  "nodeId": "condition_1",
  "type": "CONDITION",
  "name": "Check Interest",
  "config": {
    "condition": {
      "operator": "equals",
      "field": "interested",
      "value": "yes"
    }
  },
  "order": 2
}
```

#### Message Node (Interested Path)
```typescript
POST /api/v1/script-engine/nodes
{
  "versionId": "version-uuid",
  "nodeId": "message_interested",
  "type": "MESSAGE",
  "name": "Share Budget Options",
  "content": "Great! We have projects starting from 50 lakhs to 2 crores. What's your budget range?",
  "order": 3
}
```

#### Message Node (Not Interested Path)
```typescript
POST /api/v1/script-engine/nodes
{
  "versionId": "version-uuid",
  "nodeId": "message_not_interested",
  "type": "MESSAGE",
  "name": "Thank Customer",
  "content": "No problem! Can I share our brochure with you for future reference?",
  "order": 4
}
```

#### End Node
```typescript
POST /api/v1/script-engine/nodes
{
  "versionId": "version-uuid",
  "nodeId": "end_1",
  "type": "END",
  "name": "End Conversation",
  "content": "Thank you for your time! Have a great day!",
  "isExitPoint": true,
  "order": 5
}
```

### Step 3: Create Branches

#### Start → Question
```typescript
POST /api/v1/script-engine/branches
{
  "versionId": "version-uuid",
  "fromNodeId": "node-uuid-of-start",
  "toNodeId": "node-uuid-of-question",
  "label": "Initial Flow",
  "order": 0
}
```

#### Question → Condition
```typescript
POST /api/v1/script-engine/branches
{
  "versionId": "version-uuid",
  "fromNodeId": "node-uuid-of-question",
  "toNodeId": "node-uuid-of-condition",
  "label": "Evaluate Response",
  "order": 0
}
```

#### Condition → Interested Message (YES path)
```typescript
POST /api/v1/script-engine/branches
{
  "versionId": "version-uuid",
  "fromNodeId": "node-uuid-of-condition",
  "toNodeId": "node-uuid-of-interested-message",
  "condition": {
    "operator": "equals",
    "field": "interested",
    "value": "yes"
  },
  "label": "Interested",
  "order": 0
}
```

#### Condition → Not Interested Message (NO path)
```typescript
POST /api/v1/script-engine/branches
{
  "versionId": "version-uuid",
  "fromNodeId": "node-uuid-of-condition",
  "toNodeId": "node-uuid-of-not-interested-message",
  "condition": {
    "operator": "notEquals",
    "field": "interested",
    "value": "yes"
  },
  "label": "Not Interested",
  "order": 1
}
```

#### Both Messages → End
```typescript
POST /api/v1/script-engine/branches
{
  "versionId": "version-uuid",
  "fromNodeId": "node-uuid-of-interested-message",
  "toNodeId": "node-uuid-of-end",
  "label": "Complete",
  "order": 0
}

POST /api/v1/script-engine/branches
{
  "versionId": "version-uuid",
  "fromNodeId": "node-uuid-of-not-interested-message",
  "toNodeId": "node-uuid-of-end",
  "label": "Complete",
  "order": 0
}
```

### Step 4: Add Variables

```typescript
POST /api/v1/script-engine/variables
{
  "versionId": "version-uuid",
  "name": "customerName",
  "type": "STRING",
  "defaultValue": "Sir/Madam",
  "description": "Customer name",
  "isRequired": false
}

POST /api/v1/script-engine/variables
{
  "versionId": "version-uuid",
  "name": "companyName",
  "type": "STRING",
  "defaultValue": "XYZ Realty",
  "description": "Company name",
  "isRequired": true
}

POST /api/v1/script-engine/variables
{
  "versionId": "version-uuid",
  "name": "city",
  "type": "STRING",
  "defaultValue": "Mumbai",
  "description": "Target city",
  "isRequired": true
}

POST /api/v1/script-engine/variables
{
  "versionId": "version-uuid",
  "name": "interested",
  "type": "STRING",
  "description": "Customer interest level",
  "isRequired": false
}
```

### Step 5: Validate Script

```typescript
POST /api/v1/script-engine/versions/validate
{
  "versionId": "version-uuid"
}

// Response:
{
  "isValid": true,
  "errors": [],
  "warnings": [],
  "stats": {
    "totalNodes": 6,
    "totalBranches": 6,
    "totalVariables": 4,
    "entryPoints": 1,
    "exitPoints": 1,
    "reachableNodes": 6,
    "unreachableNodes": 0
  }
}
```

### Step 6: Publish Script

```typescript
POST /api/v1/script-engine/versions/{versionId}/publish
```

### Step 7: Execute Script

#### Start Execution
```typescript
POST /api/v1/script-engine/versions/execute
{
  "versionId": "version-uuid",
  "contactId": "contact-uuid",
  "variables": {
    "customerName": "Rajesh Kumar",
    "companyName": "Dream Homes Realty",
    "city": "Pune"
  }
}

// Response:
{
  "executionId": "execution-uuid",
  "currentNode": {
    "id": "...",
    "name": "Greeting",
    "type": "START"
  },
  "nextNode": {
    "id": "...",
    "name": "Ask Interest",
    "nodeId": "question_1"
  },
  "response": "Hello! I'm calling from Dream Homes Realty. Am I speaking with Rajesh Kumar?",
  "variables": {
    "customerName": "Rajesh Kumar",
    "companyName": "Dream Homes Realty",
    "city": "Pune"
  },
  "status": "RUNNING",
  "isComplete": false
}
```

#### Continue Execution (User says "Yes")
```typescript
POST /api/v1/script-engine/versions/execute
{
  "versionId": "version-uuid",
  "executionId": "execution-uuid",
  "currentNodeId": "question_1",
  "userInput": "yes"
}

// Response:
{
  "executionId": "execution-uuid",
  "currentNode": {
    "id": "...",
    "name": "Ask Interest"
  },
  "nextNode": {
    "id": "...",
    "name": "Check Interest"
  },
  "response": "We have exciting residential projects in Pune. Would you be interested in learning more?",
  "variables": {
    "customerName": "Rajesh Kumar",
    "companyName": "Dream Homes Realty",
    "city": "Pune",
    "interested": "yes"
  },
  "status": "RUNNING",
  "isComplete": false
}
```

---

## Common Script Patterns

### 1. Lead Qualification Flow
```
START
  ↓
Greeting
  ↓
Verify Identity
  ↓
Ask Interest
  ↓
CONDITION: Interested?
  ├─ YES → Ask Budget
  │         ↓
  │       CONDITION: Budget Range?
  │         ├─ Premium → Premium Projects
  │         └─ Standard → Standard Projects
  └─ NO → Polite Decline
            ↓
          Offer Brochure
  ↓
END
```

### 2. Objection Handling
```
Question Node
  ↓
CONDITION: Response Type
  ├─ "Too Expensive" → Explain Value
  ├─ "Not Interested" → Ask Reason
  ├─ "Call Later" → Schedule Callback
  └─ Other → Continue Flow
```

### 3. Multi-Language Support
```
START Node (English)
  content: "Hello! Welcome to our service."

START Node (Hindi)
  content: "नमस्ते! हमारी सेवा में आपका स्वागत है।"

START Node (Marathi)
  content: "नमस्कार! आमच्या सेवेत आपले स्वागत आहे।"
```

---

## Variable Interpolation

Use `{{variableName}}` syntax in node content:

```typescript
{
  "content": "Hello {{customerName}}, I'm calling from {{companyName}} regarding {{projectName}} in {{city}}."
}
```

At execution, variables are replaced:
```
"Hello Rajesh Kumar, I'm calling from Dream Homes Realty regarding Skyline Heights in Pune."
```

---

## Conditional Operators

### equals
```json
{
  "operator": "equals",
  "field": "interested",
  "value": "yes"
}
```

### notEquals
```json
{
  "operator": "notEquals",
  "field": "status",
  "value": "rejected"
}
```

### contains
```json
{
  "operator": "contains",
  "field": "response",
  "value": "expensive"
}
```

### greaterThan / lessThan
```json
{
  "operator": "greaterThan",
  "field": "budget",
  "value": "5000000"
}
```

### isEmpty / isNotEmpty
```json
{
  "operator": "isEmpty",
  "field": "email"
}
```

---

## Frontend Usage

### 1. Navigate to Script Builder
```
http://localhost:3000/dashboard/script-builder
```

### 2. Select a Script
Click "Edit" on any script card

### 3. Create Version (Auto-created if none exists)

### 4. Add Nodes
- Click "Add Node" in Nodes tab
- Or use quick buttons in Flow Designer tab

### 5. Add Variables
- Navigate to Variables tab
- Click "Add Variable"

### 6. Connect Nodes (Branches)
Create branches programmatically or via API

### 7. Validate
Click "Validate" button

### 8. Publish
Click "Publish" button

### 9. Preview
Click "Preview" button
- Click "Start Preview"
- Type responses
- Watch conversation flow

---

## Best Practices

### 1. Always Start with Entry Point
Every script must have exactly one START node with `isEntryPoint: true`

### 2. Always End with Exit Point
Every script should have at least one END node with `isExitPoint: true`

### 3. Name Nodes Descriptively
Use clear names: "Ask Budget", "Check Interest", "Handle Objection"

### 4. Use Variables for Personalization
Store customer data in variables for reuse across conversation

### 5. Add Fallback Branches
For CONDITION nodes, always have a default path

### 6. Validate Before Publishing
Always run validation before publishing

### 7. Test with Preview
Use preview mode to test conversation flows

### 8. Version Your Scripts
Create new versions for major changes, clone for minor changes

### 9. Archive Old Versions
Archive versions that are no longer in use

### 10. Track Execution History
Monitor execution logs for optimization

---

## Troubleshooting

### Script Won't Validate
- Check for missing entry point
- Verify all branches reference valid nodes
- Ensure no broken links

### Execution Stuck
- Check branch conditions
- Verify next node exists
- Review execution history

### Variables Not Replacing
- Check variable name spelling
- Ensure variables are initialized
- Verify `{{variableName}}` syntax

### Preview Not Working
- Ensure script is published
- Check for validation errors
- Verify API connection

---

## Example: Complete Real Estate Script

```json
{
  "nodes": [
    {
      "nodeId": "start",
      "type": "START",
      "name": "Greeting",
      "content": "Hello {{customerName}}! I'm calling from {{companyName}}.",
      "isEntryPoint": true
    },
    {
      "nodeId": "q_interest",
      "type": "QUESTION",
      "name": "Ask Interest",
      "content": "We have residential properties in {{city}}. Are you looking to buy?",
      "config": { "variableName": "interested" }
    },
    {
      "nodeId": "cond_interest",
      "type": "CONDITION",
      "name": "Check Interest"
    },
    {
      "nodeId": "q_budget",
      "type": "QUESTION",
      "name": "Ask Budget",
      "content": "What's your budget range?",
      "config": { "variableName": "budget" }
    },
    {
      "nodeId": "m_thank",
      "type": "MESSAGE",
      "name": "Thank Customer",
      "content": "No problem! Can I share our brochure?"
    },
    {
      "nodeId": "end",
      "type": "END",
      "name": "Goodbye",
      "content": "Thank you! Have a great day!",
      "isExitPoint": true
    }
  ],
  "branches": [
    { "from": "start", "to": "q_interest" },
    { "from": "q_interest", "to": "cond_interest" },
    { "from": "cond_interest", "to": "q_budget", "condition": { "operator": "equals", "field": "interested", "value": "yes" } },
    { "from": "cond_interest", "to": "m_thank", "condition": { "operator": "notEquals", "field": "interested", "value": "yes" } },
    { "from": "q_budget", "to": "end" },
    { "from": "m_thank", "to": "end" }
  ],
  "variables": [
    { "name": "customerName", "type": "STRING", "defaultValue": "Sir/Madam" },
    { "name": "companyName", "type": "STRING", "defaultValue": "Dream Homes" },
    { "name": "city", "type": "STRING", "defaultValue": "Mumbai" },
    { "name": "interested", "type": "STRING" },
    { "name": "budget", "type": "STRING" }
  ]
}
```

---

**Ready to build scripts that ensure AI never answers freely! 🚀**
