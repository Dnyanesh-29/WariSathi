export type MemberStatus = 'active' | 'warning' | 'missing';

export interface GroupMember {
  id: string;
  name: string;
  lat: number;
  lng: number;
  status: MemberStatus;
  lastSeen: string;
}

export const MOCK_GROUP_MEMBERS: GroupMember[] = [
  { id: 'm1', name: 'Ramesh Patil', lat: 17.9350, lng: 75.3350, status: 'active', lastSeen: 'Just now' },
  { id: 'm2', name: 'Suresh More', lat: 17.9300, lng: 75.3370, status: 'active', lastSeen: '2 min ago' },
  { id: 'm3', name: 'Anil Kadam', lat: 17.9400, lng: 75.3400, status: 'warning', lastSeen: '8 min ago' },
  { id: 'm4', name: 'Sambhaji Shinde', lat: 17.9000, lng: 75.3000, status: 'missing', lastSeen: '15 min ago' },
  { id: 'm5', name: 'Vishal Pawar', lat: 17.9310, lng: 75.3320, status: 'active', lastSeen: '1 min ago' },
];
