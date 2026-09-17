import {
  Banknote,
  Scale,
  TrendingUp,
  Compass,
  Activity,
  Bot,
  Clock,
  Users,
  type LucideProps,
} from "lucide-react";

const iconMap: Record<string, React.ComponentType<LucideProps>> = {
  Banknote,
  Scale,
  TrendingUp,
  Compass,
  Activity,
  Bot,
  Clock,
  Users,
};

interface TopicIconProps extends LucideProps {
  name: string;
}

export default function TopicIcon({ name, ...props }: TopicIconProps) {
  const Icon = iconMap[name];
  if (!Icon) return null;
  return <Icon {...props} />;
}
