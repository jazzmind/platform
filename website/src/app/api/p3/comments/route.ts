import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient, P3CommentType } from '@prisma/client';
import { jwtVerify } from 'jose';

const prisma = new PrismaClient();
const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'fallback-secret-key');

// Verify JWT token and get collaborator
async function verifyAuth(request: NextRequest) {
  try {
    const token = request.cookies.get('p3-auth')?.value;
    if (!token) {
      return null;
    }

    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload as { collaboratorId: string; email: string; name: string };
  } catch (error) {
    console.error('Auth verification failed:', error);
    return null;
  }
}

// POST: Create a new comment
export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const {
      pageId,
      elementSelector,
      elementPath,
      type,
      text,
      isAnonymous,
      position
    } = await request.json();

    // Validate required fields
    if (!pageId || !elementSelector || !elementPath || !type || !text) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Validate comment type
    const commentType = type.toUpperCase() as P3CommentType;
    if (!Object.values(P3CommentType).includes(commentType)) {
      return NextResponse.json(
        { error: 'Invalid comment type' },
        { status: 400 }
      );
    }

    // Create the comment
    const comment = await prisma.p3ElementComment.create({
      data: {
        pageId,
        elementSelector,
        elementPath,
        type: commentType,
        text,
        isAnonymous: isAnonymous || false,
        position: position || { x: 0, y: 0 },
        collaboratorId: auth.collaboratorId
      },
      include: {
        collaborator: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });

    return NextResponse.json({
      id: comment.id,
      pageId: comment.pageId,
      elementSelector: comment.elementSelector,
      elementPath: comment.elementPath,
      type: comment.type,
      text: comment.text,
      isAnonymous: comment.isAnonymous,
      position: comment.position,
      createdAt: comment.createdAt,
      userName: comment.isAnonymous ? 'Anonymous' : comment.collaborator.name,
      collaboratorId: comment.collaboratorId
    });

  } catch (error) {
    console.error('Error creating comment:', error);
    return NextResponse.json(
      { error: 'Failed to create comment' },
      { status: 500 }
    );
  }
}

// GET: Retrieve comments for a page
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const pageId = searchParams.get('pageId');

    if (!pageId) {
      return NextResponse.json(
        { error: 'Missing pageId parameter' },
        { status: 400 }
      );
    }

    const comments = await prisma.p3ElementComment.findMany({
      where: { pageId },
      include: {
        collaborator: {
          select: {
            id: true,
            name: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    const formattedComments = comments.map(comment => ({
      id: comment.id,
      pageId: comment.pageId,
      elementSelector: comment.elementSelector,
      elementPath: comment.elementPath,
      type: comment.type.toLowerCase(),
      text: comment.text,
      isAnonymous: comment.isAnonymous,
      position: comment.position,
      createdAt: comment.createdAt,
      userName: comment.isAnonymous ? 'Anonymous' : comment.collaborator.name,
      collaboratorId: comment.collaboratorId
    }));

    return NextResponse.json({ comments: formattedComments });

  } catch (error) {
    console.error('Error retrieving comments:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve comments' },
      { status: 500 }
    );
  }
}

// DELETE: Delete a comment
export async function DELETE(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const commentId = searchParams.get('commentId');

    if (!commentId) {
      return NextResponse.json(
        { error: 'Missing commentId parameter' },
        { status: 400 }
      );
    }

    // Check if comment exists and user owns it
    const comment = await prisma.p3ElementComment.findUnique({
      where: { id: commentId }
    });

    if (!comment) {
      return NextResponse.json(
        { error: 'Comment not found' },
        { status: 404 }
      );
    }

    if (comment.collaboratorId !== auth.collaboratorId) {
      return NextResponse.json(
        { error: 'Unauthorized to delete this comment' },
        { status: 403 }
      );
    }

    // Delete the comment
    await prisma.p3ElementComment.delete({
      where: { id: commentId }
    });

    return NextResponse.json({ message: 'Comment deleted successfully' });

  } catch (error) {
    console.error('Error deleting comment:', error);
    return NextResponse.json(
      { error: 'Failed to delete comment' },
      { status: 500 }
    );
  }
} 