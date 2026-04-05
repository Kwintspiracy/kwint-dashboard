import { NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createServerSupabaseClient } from '@/lib/supabase-server'

const MAX_STREAM_MS = 5 * 60 * 1000

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const { jobId } = await params

  // Auth check — must happen before streaming begins
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new Response('Unauthorized', { status: 401 })

  // Verify job belongs to this user — load their entity IDs and check ownership directly
  const { data: userEntities } = await supabase
    .from('entities').select('id').eq('user_id', user.id)
  const entityIds = (userEntities ?? []).map((e: { id: string }) => e.id)
  if (entityIds.length === 0) return new Response('No workspace', { status: 400 })

  const { data: jobCheck } = await supabase
    .from('agent_jobs').select('id').eq('id', jobId).in('entity_id', entityIds).single()
  if (!jobCheck) return new Response('Not found', { status: 404 })

  // Use a service-role client for polling inside the stream (runs after response boundary)
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceRoleKey) return new Response('Server misconfigured', { status: 500 })
  const dbClient = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceRoleKey)

  const encoder = new TextEncoder()
  let lastToolCallCount = 0
  const startTime = Date.now()

  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: string, data: unknown) => {
        controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`))
      }

      // Poll every 2 seconds
      const interval = setInterval(async () => {
        try {
          // Enforce max stream duration
          if (Date.now() - startTime > MAX_STREAM_MS) {
            send('error', { message: 'Stream timeout' })
            clearInterval(interval)
            controller.close()
            return
          }

          // Get job status
          const { data: job } = await dbClient
            .from('agent_jobs')
            .select('status, result, error, tools_used, turn')
            .eq('id', jobId)
            .single()

          if (!job) { clearInterval(interval); controller.close(); return }

          send('status', { status: job.status, turn: job.turn })

          // Get new tool calls since last check
          const { data: toolCalls } = await dbClient
            .from('tool_calls')
            .select('id, tool_name, created_at, duration_ms, status')
            .eq('job_id', jobId)
            .order('created_at', { ascending: true })

          if (toolCalls && toolCalls.length > lastToolCallCount) {
            const newCalls = toolCalls.slice(lastToolCallCount)
            for (const call of newCalls) {
              send('tool_call', call)
            }
            lastToolCallCount = toolCalls.length
          }

          // Close on terminal status
          if (job.status === 'completed' || job.status === 'failed') {
            send('done', { status: job.status, result: job.result, error: job.error })
            clearInterval(interval)
            controller.close()
          }
        } catch (e) {
          send('error', { message: 'Stream error' })
          clearInterval(interval)
          controller.close()
        }
      }, 2000)

      // Clean up on abort
      request.signal.addEventListener('abort', () => {
        clearInterval(interval)
        controller.close()
      })
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  })
}
