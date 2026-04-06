import type { AgentTemplate } from './agent-templates'

export type AgentPack = {
  id: string
  name: string
  description: string
  icon: string
  category: AgentTemplate['category']
  orchestratorId: string
  agents: string[]           // AgentTemplate ids — orchestrator first
  suggestedConnectors: string[]
  agentCount: number
}

export const AGENT_PACKS: AgentPack[] = [
  {
    id: 'job-hunting',
    name: 'Job Hunting Squad',
    description: 'Tailor resumes, write cover letters, and track every application automatically. One orchestrator runs the full workflow.',
    icon: '🎯',
    category: 'hiring',
    orchestratorId: 'job-hunt-orchestrator',
    agents: ['job-hunt-orchestrator', 'resume-tailor', 'cover-letter-writer', 'application-tracker'],
    suggestedConnectors: ['gmail', 'google-docs', 'google-sheets'],
    agentCount: 4,
  },
  {
    id: 'marketing-agency',
    name: 'Marketing Agency',
    description: 'Content, SEO, and social media — a full marketing team coordinated by one orchestrator.',
    icon: '📣',
    category: 'marketing',
    orchestratorId: 'marketing-orchestrator',
    agents: ['marketing-orchestrator', 'seo-content-writer', 'social-media-manager', 'content-writer'],
    suggestedConnectors: ['notion', 'slack'],
    agentCount: 4,
  },
  {
    id: 'dev-agency',
    name: 'Dev Agency',
    description: 'Code review, architecture, and project tracking. Ships faster with fewer bugs.',
    icon: '🛠️',
    category: 'development',
    orchestratorId: 'tech-lead',
    agents: ['tech-lead', 'code-reviewer', 'devops-monitor'],
    suggestedConnectors: ['github', 'slack'],
    agentCount: 3,
  },
  {
    id: 'sales-machine',
    name: 'Sales Machine',
    description: 'Research leads, write personalized outreach, update CRM. Full pipeline on autopilot.',
    icon: '💰',
    category: 'sales',
    orchestratorId: 'sales-orchestrator',
    agents: ['sales-orchestrator', 'lead-researcher', 'outreach-writer'],
    suggestedConnectors: ['gmail', 'hubspot'],
    agentCount: 3,
  },
  {
    id: 'media-studio',
    name: 'Media Studio',
    description: 'Script videos, design thumbnail briefs, and manage your content production pipeline.',
    icon: '🎬',
    category: 'media',
    orchestratorId: 'media-orchestrator',
    agents: ['media-orchestrator', 'video-script-writer', 'thumbnail-brief-agent'],
    suggestedConnectors: ['notion', 'slack'],
    agentCount: 3,
  },
  {
    id: 'startup-ops',
    name: 'Startup Ops',
    description: 'Research, personal assistant, and data analysis — the core trio for founders moving fast.',
    icon: '🚀',
    category: 'productivity',
    orchestratorId: 'personal-assistant',
    agents: ['personal-assistant', 'research-assistant', 'data-analyst'],
    suggestedConnectors: ['gmail', 'google-sheets', 'notion', 'slack'],
    agentCount: 3,
  },
]
