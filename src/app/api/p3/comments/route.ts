import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-key';

// GET /api/p3/comments - Fetch comments for a page
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const pageId = searchParams.get('pageId');

    if (!pageId) {
      return NextResponse.json({ error: 'Page ID is required' }, { status: 400 });
    }

    const comments = await prisma.p3ElementComment.findMany({
      where: { pageId },
      include: {
        collaborator: {
          select: {
            email: true,
            isAnonymous: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const formattedComments = comments.map(comment => ({
      id: comment.id,
      elementSelector: comment.elementSelector,
      elementPath: comment.elementPath,
      commentType: comment.commentType,
      content: comment.content,
      isAnonymous: comment.isAnonymous,
      author: comment.isAnonymous ? 'Anonymous' : comment.collaborator.email,
      createdAt: comment.createdAt,
      position: comment.position ? JSON.parse(comment.position) : null,
    }));

    return NextResponse.json({ comments: formattedComments });
  } catch (error) {
    console.error('Error fetching comments:', error);
    return NextResponse.json({ error: 'Failed to fetch comments' }, { status: 500 });
  }
}

// POST /api/p3/comments - Create a new comment
export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get('p3-auth')?.value;
    
    if (!token) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET) as any;
    } catch (error) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const collaborator = await prisma.p3Collaborator.findUnique({
      where: { email: decoded.email },
    });

    if (!collaborator) {
      return NextResponse.json({ error: 'Collaborator not found' }, { status: 404 });
    }

    const body = await request.json();
    const { pageId, elementSelector, elementPath, commentType, content, isAnonymous, position } = body;

    if (!pageId || !elementSelector || !commentType || !content) {
      return NextResponse.json({ 
        error: 'pageId, elementSelector, commentType, and content are required' 
      }, { status: 400 });
    }

    const comment = await prisma.p3ElementComment.create({
      data: {
        pageId,
        elementSelector,
        elementPath: elementPath || '',
        commentType,
        content,
        isAnonymous: isAnonymous || false,
        position: position ? JSON.stringify(position) : null,
        collaboratorId: collaborator.id,
      },
      include: {
        collaborator: {
          select: {
            email: true,
            isAnonymous: true,
          },
        },
      },
    });

    const formattedComment = {
      id: comment.id,
      elementSelector: comment.elementSelector,
      elementPath: comment.elementPath,
      commentType: comment.commentType,
      content: comment.content,
      isAnonymous: comment.isAnonymous,
      author: comment.isAnonymous ? 'Anonymous' : comment.collaborator.email,
      createdAt: comment.createdAt,
      position: comment.position ? JSON.parse(comment.position) : null,
    };

    return NextResponse.json({ 
      success: true, 
      comment: formattedComment 
    });
  } catch (error) {
    console.error('Error creating comment:', error);
    return NextResponse.json({ error: 'Failed to create comment' }, { status: 500 });
  }
} 