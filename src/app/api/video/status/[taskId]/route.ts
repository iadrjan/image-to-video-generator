import { NextRequest, NextResponse } from 'next/server';
import { getTask, hasTask } from '@/lib/task-store';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  try {
    const { taskId } = await params;
    
    console.log('[Status] Checking status for task:', taskId);
    
    if (!taskId) {
      return NextResponse.json(
        { error: 'Task ID is required' },
        { status: 400 }
      );
    }

    if (!hasTask(taskId)) {
      console.log('[Status] Task not found:', taskId);
      return NextResponse.json(
        { error: 'Task not found' },
        { status: 404 }
      );
    }

    const task = getTask(taskId);
    
    console.log('[Status] Task status:', {
      taskId,
      status: task?.status,
      progress: task?.progress,
      hasVideoUrl: !!task?.videoUrl
    });

    return NextResponse.json({
      status: task?.status,
      progress: task?.progress || 0,
      videoUrl: task?.videoUrl,
      error: task?.error,
    });
  } catch (error) {
    console.error('[Status] Check error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
