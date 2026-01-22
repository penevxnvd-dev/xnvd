import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabaseApi } from '@/lib/supabaseApi';
import { trainingStructure, calculateTrainingProgress } from '@/data/trainingStructure';

export interface User {
  id: string;
  fullName: string;
  email: string;
  role: string;
  createdAt?: string;
  userId?: string;
  realtorId?: string;
  progress?: number;
  completedSubsections?: number;
  totalSubsections?: number;
  type?: 'trainee' | 'realtor';
  status?: 'active' | 'inactive';
  inactivityReason?: string;
  level?: number;
}

interface UseUsersOptions {
  canFullManageUsers?: boolean;
  enabled?: boolean;
}

export const useUsers = (options: UseUsersOptions = {}) => {
  const { canFullManageUsers = false, enabled = true } = options;

  return useQuery({
    queryKey: ['users', canFullManageUsers],
    queryFn: async () => {
      const allUsers: User[] = [];
      const usersMap = new Map<string, User>();

      // Parallel fetch: groups, realtors, and profiles
      const [groups, realtorsResult, allProfilesResult] = await Promise.all([
        supabaseApi.getAllTrainingGroups(),
        supabaseApi.supabase
          .from('realtors')
          .select('id, user_id, level'),
        canFullManageUsers
          ? supabaseApi.supabase
              .from('profiles')
              .select(`
                id,
                full_name,
                email,
                created_at,
                status,
                inactivity_reason,
                user_roles!left (role)
              `)
              .order('full_name', { ascending: true })
          : Promise.resolve({ data: null, error: null }),
      ]);

      // 1. Process trainees from training groups
      if (groups) {
        groups.forEach((group) => {
          group.trainees.forEach((trainee) => {
            if (trainee.email && !usersMap.has(trainee.email)) {
              usersMap.set(trainee.email, {
                id: trainee.id,
                fullName: trainee.name,
                email: trainee.email,
                role: 'trainee',
                type: 'trainee',
                progress: 0,
                completedSubsections: 0,
                totalSubsections: 0,
                status: 'active',
              });
            }
          });
        });
      }

      // 2. Process realtors with profiles
      if (realtorsResult.data && !realtorsResult.error) {
        const realtors = realtorsResult.data;
        const userIds = realtors.map((r: any) => r.user_id).filter(Boolean);

        if (userIds.length > 0) {
          // Fetch profiles for realtors in parallel
          const { data: profiles, error: profilesError } = await supabaseApi.supabase
            .from('profiles')
            .select(`
              id,
              full_name,
              email,
              created_at,
              status,
              inactivity_reason,
              user_roles!left (role)
            `)
            .in('id', userIds);

          if (!profilesError && profiles) {
            const profilesMap = new Map(profiles.map((p: any) => [p.id, p]));

            realtors.forEach((realtor: any) => {
              const profile = profilesMap.get(realtor.user_id);
              if (profile && profile.email) {
                if (!usersMap.has(profile.email)) {
                  usersMap.set(profile.email, {
                    id: profile.id,
                    fullName: profile.full_name || profile.email,
                    email: profile.email,
                    userId: profile.id,
                    realtorId: realtor.id,
                    role: profile.user_roles?.[0]?.role || 'realtor',
                    type: 'realtor',
                    level: realtor.level,
                    progress: 0,
                    completedSubsections: 0,
                    totalSubsections: 0,
                    createdAt: profile.created_at,
                    status: (profile.status || 'active') as 'active' | 'inactive',
                    inactivityReason: profile.inactivity_reason || undefined,
                  });
                } else {
                  const existing = usersMap.get(profile.email)!;
                  existing.id = profile.id;
                  existing.userId = profile.id;
                  existing.realtorId = realtor.id;
                  existing.type = 'realtor';
                  existing.level = realtor.level;
                  existing.role = profile.user_roles?.[0]?.role || 'realtor';
                  existing.createdAt = profile.created_at;
                  existing.status = (profile.status || 'active') as 'active' | 'inactive';
                  existing.inactivityReason = profile.inactivity_reason || undefined;
                }
              }
            });
          }
        }
      }

      // 3. Process all profiles for admins/managers
      if (canFullManageUsers && allProfilesResult.data && !allProfilesResult.error) {
        const allProfiles = allProfilesResult.data;
        allProfiles.forEach((profile: any) => {
          if (!usersMap.has(profile.email)) {
            usersMap.set(profile.email, {
              id: profile.id,
              fullName: profile.full_name || 'Без име',
              email: profile.email || 'Без имейл',
              userId: profile.id,
              role: profile.user_roles?.[0]?.role || 'Няма роля',
              createdAt: profile.created_at,
              status: (profile.status || 'active') as 'active' | 'inactive',
              inactivityReason: profile.inactivity_reason || undefined,
            });
          }
        });
      }

      // 4. Calculate training progress for each user (batch fetch)
      const usersArray = Array.from(usersMap.values());
      const totalSubsections = trainingStructure.reduce(
        (sum, section) => sum + section.subsections.length,
        0
      );

      // Batch fetch training progress for all users
      const userIdsWithProgress = usersArray
        .filter((u) => u.userId)
        .map((u) => u.userId!);

      if (userIdsWithProgress.length > 0) {
        // Fetch all training progress in parallel
        const progressPromises = userIdsWithProgress.map((userId) =>
          supabaseApi.getTrainingProgress(userId).catch(() => [])
        );

        const allProgressData = await Promise.all(progressPromises);
        const progressMap = new Map<string, any[]>();

        userIdsWithProgress.forEach((userId, index) => {
          progressMap.set(userId, allProgressData[index] || []);
        });

        // Calculate progress for each user
        usersArray.forEach((user) => {
          if (user.userId) {
            const progressData = progressMap.get(user.userId) || [];

            if (progressData.length > 0) {
              const updatedData = trainingStructure.map((section) => ({
                ...section,
                subsections: section.subsections.map((subsection) => {
                  const progressItem = progressData.find(
                    (p: { section?: string; subsection?: string }) =>
                      p.section === section.id && p.subsection === subsection.id
                  );
                  return {
                    ...subsection,
                    progress: progressItem
                      ? {
                          lecture:
                            (progressItem as { lecture_completed?: boolean })
                              .lecture_completed || false,
                          video:
                            (progressItem as { video_completed?: boolean })
                              .video_completed || false,
                          practical:
                            (progressItem as { practical_completed?: boolean })
                              .practical_completed || false,
                          handover:
                            (progressItem as { handover_completed?: boolean })
                              .handover_completed || false,
                          exam:
                            (progressItem as { exam_completed?: boolean })
                              .exam_completed || false,
                        }
                      : null,
                  };
                }),
              }));

              const { progress, completedSubsections } =
                calculateTrainingProgress(updatedData);
              user.progress = progress;
              user.completedSubsections = completedSubsections;
              user.totalSubsections = totalSubsections;
            } else {
              user.progress = 0;
              user.completedSubsections = 0;
              user.totalSubsections = totalSubsections;
            }
          }
        });
      }

      // Sort users by name
      usersArray.sort((a, b) =>
        (a.fullName || '').localeCompare(b.fullName || '')
      );

      return usersArray;
    },
    enabled,
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });
};

// Hook for invalidating users cache
export const useInvalidateUsers = () => {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: ['users'] });
  };
};
