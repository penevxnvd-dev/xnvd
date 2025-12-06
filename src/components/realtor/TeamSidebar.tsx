import { useState, useEffect } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Crown, Users } from 'lucide-react';
import { supabaseApi } from '@/lib/supabaseApi';
import { formatNameWithEmoji } from '@/utils/nameEmojis';
import { cn } from '@/lib/utils';

interface TeamMember {
  id: string;
  name: string;
  email: string;
  level: number;
  avatar?: string;
}

interface TeamLeader {
  id: string;
  name: string;
  email: string;
  level: number;
  avatar?: string;
}

interface TeamSidebarProps {
  realtorId: string;
  userId: string;
  isOpen: boolean;
  onToggle: () => void;
}

export const TeamSidebar = ({ realtorId, userId, isOpen, onToggle }: TeamSidebarProps) => {
  const [leader, setLeader] = useState<TeamLeader | null>(null);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTeamData();
  }, [realtorId]);

  const fetchTeamData = async () => {
    try {
      setLoading(true);
      // Get current realtor with team info
      const realtor = await supabaseApi.getCurrentRealtor();
      
      if (!realtor || !realtor.team_id) {
        setLoading(false);
        return;
      }

      // Get all offices to find team
      const offices = await supabaseApi.getAllOfficesFull();
      
      for (const office of offices) {
        for (const team of office.teams || []) {
          if (team.id === realtor.team_id) {
            // Found the team
            if (team.leader) {
              setLeader({
                id: team.leader.id,
                name: team.leader.full_name,
                email: team.leader.email,
                level: team.leader.realtor?.level || 5,
                avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(team.leader.email)}`,
              });
            }

            // Get team members (excluding leader)
            const members = (team.realtors || [])
              .filter((r: { user_id?: string }) => r.user_id !== team.leader?.id)
              .map((r: { id: string; profile?: { full_name?: string; email?: string }; level?: number }) => ({
                id: r.id,
                name: r.profile?.full_name || 'Неизвестен',
                email: r.profile?.email || '',
                level: r.level || 1,
                avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(r.profile?.email || '')}`,
              }));

            setTeamMembers(members);
            break;
          }
        }
      }
    } catch (error) {
      console.error('Error fetching team data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getLevelLabel = (level: number) => {
    if (level === 1) return 'Чирак';
    if (level === 3) return 'Реализатор';
    if (level === 5) return 'Елит';
    return `Ниво ${level}`;
  };

  const getLevelColor = (level: number) => {
    if (level === 1) return 'bg-gray-500';
    if (level === 3) return 'bg-blue-500';
    if (level === 5) return 'bg-purple-500';
    return 'bg-gray-400';
  };

  if (!isOpen) {
    return (
      <button
        onClick={onToggle}
        className="fixed left-0 top-1/2 -translate-y-1/2 z-50 bg-primary text-primary-foreground p-2 rounded-r-lg shadow-lg hover:bg-primary/90 transition-colors"
      >
        <Users className="h-5 w-5" />
      </button>
    );
  }

  return (
    <div className="w-64 bg-gray-900 text-gray-100 flex flex-col border-r border-gray-800">
      {/* Header */}
      <div className="p-4 border-b border-gray-800">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-400">
            Екип
          </h2>
          <button
            onClick={onToggle}
            className="text-gray-400 hover:text-gray-200 transition-colors"
          >
            ×
          </button>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          {/* Team Leader */}
          {leader && (
            <div className="mb-4">
              <div className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-gray-800 transition-colors">
                <Crown className="h-4 w-4 text-yellow-500 flex-shrink-0" />
                <Avatar className="h-8 w-8 flex-shrink-0">
                  <AvatarImage src={leader.avatar} />
                  <AvatarFallback className="bg-gray-700 text-xs">
                    {leader.name
                      .split(' ')
                      .map((n) => n[0])
                      .join('')}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">
                    {formatNameWithEmoji(leader.name)}
                  </div>
                  <div className="text-xs text-gray-400 truncate">
                    Ръководител
                  </div>
                </div>
                <Badge
                  className={cn('text-xs px-1.5 py-0', getLevelColor(leader.level))}
                >
                  {getLevelLabel(leader.level)}
                </Badge>
              </div>
            </div>
          )}

          {/* Team Members Section */}
          {teamMembers.length > 0 && (
            <div>
              <div className="mt-1 space-y-1">
                {teamMembers.map((member) => (
                  <div
                    key={member.id}
                    className={cn(
                      'flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-gray-800 transition-colors cursor-pointer',
                      member.id === realtorId && 'bg-gray-800'
                    )}
                  >
                    <Avatar className="h-8 w-8 flex-shrink-0">
                      <AvatarImage src={member.avatar} />
                      <AvatarFallback className="bg-gray-700 text-xs">
                        {member.name
                          .split(' ')
                          .map((n) => n[0])
                          .join('')}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">
                        {formatNameWithEmoji(member.name)}
                      </div>
                      <div className="text-xs text-gray-400 truncate">
                        {getLevelLabel(member.level)}
                      </div>
                    </div>
                    {member.id === realtorId && (
                      <div className="h-2 w-2 rounded-full bg-green-500 flex-shrink-0" />
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
};

