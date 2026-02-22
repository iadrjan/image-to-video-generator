import { NextRequest, NextResponse } from 'next/server';
import { getTask, setTask, hasTask } from '@/lib/task-store';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  try {
    const { taskId } = await params;
    
    console.log('[Cancel] Cancelling task:', taskId);
    
    if (!taskId) {
      return NextResponse.json(
        { error: 'Task ID is required' },
        { status: 400 }
      );
    }

    if (!hasTask(taskId)) {
      console.log('[Cancel] Task not found:', taskId);
      return NextResponse.json(
        { error: 'Task not found' },
        { status: 404 }
      );
    }

    const task = getTask(taskId);
    
    // Mark as cancelled
    if (task) {
      setTask(taskId, {
        ...task,
        status: 'CANCELLED',
      });
    }

    console.log('[Cancel] Task cancelled:', taskId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[Cancel] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
