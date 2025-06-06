export default function FeedbackPage() {
  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Feedback</h1>
        </div>
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2">
            <span className="text-sm text-slate-600">Search:</span>
            <input
              type="text"
              className="border border-slate-300 rounded-lg px-3 py-1.5 text-sm w-64"
              placeholder="Search feedback..."
            />
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-sm text-slate-600">Show</span>
            <select className="border border-slate-300 rounded-lg px-3 py-1.5 text-sm">
              <option>25</option>
              <option>50</option>
              <option>100</option>
            </select>
            <span className="text-sm text-slate-600">entries</span>
          </div>
        </div>
      </div>

      {/* Feedback Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Title
                </th>
                <th className="px-6 py-4 text-center text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Incomplete
                </th>
                <th className="px-6 py-4 text-center text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Unassigned
                </th>
                <th className="px-6 py-4 text-center text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Awaiting Feedback
                </th>
                <th className="px-6 py-4 text-center text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Unread Feedback
                </th>
                <th className="px-6 py-4 text-center text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Complete
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-200">
              <FeedbackRow
                title="Onboarding and Capstone Challenge Welcome: Practera User Guide"
                subtitle="Unlock a Task!"
                badges={["quiz"]}
                incomplete={0}
                unassigned={5}
                awaitingFeedback={0}
                unreadFeedback={0}
                complete={10}
              />
              <FeedbackRow
                title="Onboarding and Capstone Challenge Welcome: Your Employability Skill Development"
                subtitle="Employability Skills Reflection"
                dueDate="Due: 5/13/2025, 12:00:00 AM"
                badges={["reflection"]}
                incomplete={0}
                unassigned={2}
                awaitingFeedback={0}
                unreadFeedback={0}
                complete={13}
              />
              <FeedbackRow
                title="Week 1: Conducting a Vulnerability Scan: Week 1 Submission - Peer Feedback"
                subtitle="Initial Risk Recommendations - Peer Feedback"
                dueDate="Due: 5/16/2025, 12:00:00 AM"
                badges={["moderated"]}
                incomplete={5}
                unassigned={0}
                awaitingFeedback={2}
                unreadFeedback={3}
                complete={5}
                sectionClass="bg-slate-100"
              />
              <FeedbackRow
                title="Week 1: Conducting a Vulnerability Scan: Week 1 Submission - Industry Expert Feedback"
                subtitle="Initial Risk Recommendations - Team Submission"
                dueDate="Due: 5/19/2025, 12:00:00 AM"
                badges={["moderated", "team"]}
                incomplete={1}
                unassigned={0}
                awaitingFeedback={2}
                unreadFeedback={0}
                complete={0}
                sectionClass="bg-slate-100"
              />
              <FeedbackRow
                title="Week 2: Creating Recommendations: Week 2 Submission - Industry Expert Feedback"
                subtitle="Final Recommendations - Team Submission"
                dueDate="Due: 5/24/2025, 12:00:00 AM"
                badges={["moderated", "team"]}
                incomplete={0}
                unassigned={3}
                awaitingFeedback={0}
                unreadFeedback={0}
                complete={0}
                sectionClass="bg-slate-100"
              />
              <FeedbackRow
                title="Conclusion: Building a Professional Profile"
                subtitle="Employability Skills Final Reflection"
                dueDate="Due: 5/24/2025, 12:00:00 AM"
                badges={["reflection"]}
                incomplete={11}
                unassigned={0}
                awaitingFeedback={0}
                unreadFeedback={0}
                complete={4}
              />
              <FeedbackRow
                title="Conclusion: Sharing Your Experience with Future Employers"
                subtitle="Your STAR Statement"
                dueDate="Due: 5/24/2025, 12:00:00 AM"
                badges={["reflection"]}
                incomplete={11}
                unassigned={0}
                awaitingFeedback={0}
                unreadFeedback={0}
                complete={4}
              />
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

function FeedbackRow({
  title,
  subtitle,
  dueDate,
  badges = [],
  incomplete,
  unassigned,
  awaitingFeedback,
  unreadFeedback,
  complete,
  sectionClass = ""
}: {
  title: string;
  subtitle: string;
  dueDate?: string;
  badges?: string[];
  incomplete: number;
  unassigned: number;
  awaitingFeedback: number;
  unreadFeedback: number;
  complete: number;
  sectionClass?: string;
}) {
  const getBadgeClass = (badge: string) => {
    switch (badge) {
      case 'quiz':
        return 'bg-blue-100 text-blue-800';
      case 'reflection':
        return 'bg-purple-100 text-purple-800';
      case 'moderated':
        return 'bg-teal-100 text-teal-800';
      case 'team':
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-slate-100 text-slate-800';
    }
  };

  return (
    <tr className={`hover:bg-slate-50 ${sectionClass}`}>
      <td className="px-6 py-4">
        <div>
          <div className="text-sm font-medium text-slate-900 mb-1">{title}</div>
          <div className="flex items-center space-x-2 mb-2">
            <a href="#" className="text-sm text-teal-600 hover:text-teal-700 underline">
              {subtitle}
            </a>
            {badges.map((badge, index) => (
              <span
                key={index}
                className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getBadgeClass(badge)}`}
              >
                {badge}
              </span>
            ))}
          </div>
          {dueDate && (
            <div className="text-xs text-slate-500">{dueDate}</div>
          )}
        </div>
      </td>
      <td className="px-6 py-4 text-center">
        <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium ${
          incomplete > 0 ? 'bg-red-100 text-red-800' : 'text-slate-500'
        }`}>
          {incomplete || '-'}
        </span>
      </td>
      <td className="px-6 py-4 text-center">
        <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium ${
          unassigned > 0 ? 'bg-orange-100 text-orange-800' : 'text-slate-500'
        }`}>
          {unassigned || '-'}
        </span>
      </td>
      <td className="px-6 py-4 text-center">
        <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium ${
          awaitingFeedback > 0 ? 'bg-blue-100 text-blue-800' : 'text-slate-500'
        }`}>
          {awaitingFeedback || '-'}
        </span>
      </td>
      <td className="px-6 py-4 text-center">
        <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium ${
          unreadFeedback > 0 ? 'bg-purple-100 text-purple-800' : 'text-slate-500'
        }`}>
          {unreadFeedback || '-'}
        </span>
      </td>
      <td className="px-6 py-4 text-center">
        <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium ${
          complete > 0 ? 'bg-green-100 text-green-800' : 'text-slate-500'
        }`}>
          {complete || '-'}
        </span>
      </td>
    </tr>
  )
} 