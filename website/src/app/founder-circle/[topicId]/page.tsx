import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTopicById, getAdjacentTopics, topics } from "@/data/founder-circle/topics";
import TopicContent from "./TopicContent";

interface PageProps {
  params: Promise<{ topicId: string }>;
}

export async function generateStaticParams() {
  return topics.map((t) => ({ topicId: t.id }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { topicId } = await params;
  const topic = getTopicById(topicId);
  if (!topic) return {};

  return {
    title: `${topic.title} — MITAS Founder Circle | Wes Sonnenreich`,
    description: topic.coreInsight.slice(0, 160),
    openGraph: {
      title: `${topic.title} — MITAS Founder Circle`,
      description: topic.coreInsight.slice(0, 160),
      type: "article",
    },
  };
}

export default async function TopicPage({ params }: PageProps) {
  const { topicId } = await params;
  const topic = getTopicById(topicId);

  if (!topic) {
    notFound();
  }

  const { prev, next } = getAdjacentTopics(topicId);

  return <TopicContent topic={topic} prev={prev} next={next} />;
}
