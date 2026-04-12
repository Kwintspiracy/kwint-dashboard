// Starter "recipes" — bundles of pre-written memories a user can apply to an
// agent in one click. Each recipe represents a common use case (job search,
// email triage, etc.) with the memories pre-shaped to match how that use case
// typically breaks agent runs.
//
// Recipe memories have placeholders in {{DOUBLE_BRACES}} the user fills in via
// a form before we INSERT them. Keeps them generic across workspaces.

export type RecipePlaceholder = {
  key: string
  label: string
  help: string
  example: string
}

export type RecipeMemory = {
  /** The memory text with {{placeholders}} */
  fact: string
  category: 'preference' | 'context' | 'learned_rule' | 'outcome'
  importance: 1 | 2 | 3 | 4 | 5
  /** When true the memory is global (agent_id = null), else scoped to the current agent */
  global: boolean
  skill_tags: string[]
}

export type MemoryRecipe = {
  id: string
  name: string
  description: string
  /** Placeholders collected from the user before insert */
  placeholders: RecipePlaceholder[]
  memories: RecipeMemory[]
}

export const MEMORY_RECIPES: MemoryRecipe[] = [
  {
    id: 'notion-job-hunt',
    name: 'Notion job-hunt database',
    description: 'Teach the agent where your job offers live in Notion and how to extract the JD from the external URL stored in each row.',
    placeholders: [
      {
        key: 'DB_ID',
        label: 'Notion database id',
        help: 'The UUID of your JobHunt database (the long string in the database URL, remove dashes not needed).',
        example: '33ef2854-9a8c-80d0-9258-e3445b7644be',
      },
      {
        key: 'COMPANY_PROP',
        label: 'Company property name',
        help: 'The exact name of the "company" column in your database.',
        example: 'Company',
      },
      {
        key: 'URL_PROP',
        label: 'Job URL property name',
        help: 'The exact name of the column that holds the external link to the JD.',
        example: 'Job URL',
      },
    ],
    memories: [
      {
        fact: 'Job offers live in a single Notion database (database_id: {{DB_ID}}). Each row is one offer. Key properties: "{{COMPANY_PROP}}" (rich_text) and "{{URL_PROP}}" (url — the real external JD link). The Notion PAGE body for each row is usually empty — the JD text lives at {{URL_PROP}}, NOT in the page content.',
        category: 'preference',
        importance: 5,
        global: true,
        skill_tags: ['notion', 'job-search'],
      },
      {
        fact: 'Standard job-offer lookup recipe: (1) notion_query_database(database_id="{{DB_ID}}", filter={"property":"{{COMPANY_PROP}}","rich_text":{"contains":"<COMPANY>"}}); (2) extract "{{URL_PROP}}" from the returned row; (3) fetch_page(<URL>) to get the full JD markdown. Do NOT use notion_search — it returns stale residual pages. Do NOT call notion_get_page_content on a JobHunt row page — it is empty by design.',
        category: 'preference',
        importance: 5,
        global: false, // scoped to the agent the recipe is applied to
        skill_tags: ['notion', 'job-search', 'task-board'],
      },
    ],
  },
  {
    id: 'google-drive-resumes',
    name: 'Google Drive resumes',
    description: 'Teach the agent where your resume files live on Drive and which format to prefer when reading.',
    placeholders: [
      {
        key: 'FOLDER_URL',
        label: 'Drive folder URL',
        help: 'The shareable URL of the Drive folder containing your resume files.',
        example: 'https://drive.google.com/drive/folders/1Jg9WjPEXU0uSQh9lMmG_BTf-oWC5zjm6',
      },
    ],
    memories: [
      {
        fact: 'All resume versions live in Google Drive folder {{FOLDER_URL}}. Prefer .docx files over .pdf — Drive cannot reliably extract text from non-OCR PDFs (drive_read_file returns an error message). To list all resumes, use drive_list_files with query `name contains "resume" or name contains "CV"` (global name search) rather than folder-scoped queries, because resume files are sometimes outside the main folder. For each .docx found, call drive_read_file with file_id and file_name — it returns the full text.',
        category: 'preference',
        importance: 5,
        global: true,
        skill_tags: ['google-drive', 'file-storage', 'job-search'],
      },
    ],
  },
  {
    id: 'return-fast',
    name: 'Return fast when blocked',
    description: 'Prevent workers from burning their token budget in exploration loops. Teaches them to return partial results quickly when they hit walls.',
    placeholders: [],
    memories: [
      {
        fact: 'Budget discipline: if a tool returns an error twice in a row for the same query (403, 404, empty result), DO NOT retry with a slight variation. Return_result with status="blocked" and explain exactly what you tried and why it failed. Partial data returned early is ALWAYS more useful than "[Token budget exceeded]". Maximum 2 attempts per data source before returning blocked.',
        category: 'preference',
        importance: 5,
        global: false,
        skill_tags: ['task-board', 'budget'],
      },
      {
        fact: 'When a task briefing says "find X in Notion/Drive/Web", follow the briefing recipe verbatim if one is provided. Do NOT invent alternate search strategies unless the recipe has been exhausted. Trust the recipe — it exists because exploration has cost.',
        category: 'preference',
        importance: 4,
        global: false,
        skill_tags: ['task-board'],
      },
    ],
  },
]
