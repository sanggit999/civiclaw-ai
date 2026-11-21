import { NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase-server';

export interface ChatSessionAdminView {
  id: string;
  title: string;
  userId?: string | null;
  messageCount: number;
  lastMessageSnippet?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ChatMessageAdminView {
  id: string;
  sessionId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  standaloneQuery?: string | null;
  citations: Array<{
    documentNumber?: string;
    articleNumber?: string;
    clauseNumber?: string;
    title?: string;
  }>;
  isGrounded: boolean;
  createdAt: string;
}

const mockSessions: ChatSessionAdminView[] = [
  {
    id: 'sess-001',
    title: 'Tư vấn mức phạt nồng độ cồn xe máy và ô tô',
    userId: null,
    messageCount: 4,
    lastMessageSnippet: 'Theo Nghị định 100/2019/NĐ-CP Điều 5 và Điều 6, mức phạt nồng độ cồn...',
    createdAt: new Date(Date.now() - 3600000 * 2).toISOString(),
    updatedAt: new Date(Date.now() - 3600000 * 1.8).toISOString(),
  },
  {
    id: 'sess-002',
    title: 'Hỏi về thời gian thử việc theo Bộ luật Lao động',
    userId: null,
    messageCount: 2,
    lastMessageSnippet: 'Căn cứ Điều 25 Bộ luật Lao động 2019, thời gian thử việc tối đa...',
    createdAt: new Date(Date.now() - 3600000 * 5).toISOString(),
    updatedAt: new Date(Date.now() - 3600000 * 4.9).toISOString(),
  },
  {
    id: 'sess-003',
    title: 'Điều kiện hưởng lương hưu theo Luật BHXH 2024',
    userId: null,
    messageCount: 3,
    lastMessageSnippet: 'Luật BHXH 2024 quy định giảm thời gian đóng tối thiểu từ 20 năm xuống 15 năm...',
    createdAt: new Date(Date.now() - 3600000 * 8).toISOString(),
    updatedAt: new Date(Date.now() - 3600000 * 7.5).toISOString(),
  },
  {
    id: 'sess-004',
    title: 'Quyền đơn phương chấm dứt hợp đồng thuê nhà',
    userId: null,
    messageCount: 2,
    lastMessageSnippet: 'Theo Điều 132 Luật Nhà ở 2023 và Điều 472 Bộ luật Dân sự 2015...',
    createdAt: new Date(Date.now() - 3600000 * 24).toISOString(),
    updatedAt: new Date(Date.now() - 3600000 * 23.8).toISOString(),
  },
];

const mockMessagesBySession: Record<string, ChatMessageAdminView[]> = {
  'sess-001': [
    {
      id: 'msg-001',
      sessionId: 'sess-001',
      role: 'user',
      content: 'Cho tôi hỏi đi xe máy uống 1 lon bia thì bị phạt bao nhiêu tiền?',
      standaloneQuery: 'Mức phạt nồng độ cồn người điều khiển xe máy uống 1 lon bia',
      citations: [],
      isGrounded: true,
      createdAt: new Date(Date.now() - 3600000 * 2).toISOString(),
    },
    {
      id: 'msg-002',
      sessionId: 'sess-001',
      role: 'assistant',
      content: 'Căn cứ theo điểm c khoản 6 Điều 6 Nghị định 100/2019/NĐ-CP (sửa đổi, bổ sung bởi Nghị định 123/2021/NĐ-CP):\nNgười điều khiển xe mô tô, xe gắn máy trên đường mà trong máu hoặc hơi thở có nồng độ cồn nhưng chưa vượt quá 50 miligam/100 mililít máu hoặc chưa vượt quá 0,25 miligam/1 lít khí thở (thường tương đương 1 lon bia tùy thể trạng) sẽ bị phạt tiền từ 2.000.000 đồng đến 3.000.000 đồng.\nNgoài ra, người vi phạm còn bị tước quyền sử dụng Giấy phép lái xe từ 10 tháng đến 12 tháng.',
      standaloneQuery: null,
      citations: [
        {
          documentNumber: '100/2019/NĐ-CP',
          articleNumber: 'Điều 6',
          clauseNumber: 'Khoản 6 Điểm c',
          title: 'Xử phạt người điều khiển xe mô tô, xe gắn máy vi phạm quy tắc giao thông đường bộ',
        },
      ],
      isGrounded: true,
      createdAt: new Date(Date.now() - 3600000 * 1.95).toISOString(),
    },
    {
      id: 'msg-003',
      sessionId: 'sess-001',
      role: 'user',
      content: 'Thế nếu là xe ô tô thì mức phạt thấp nhất là bao nhiêu?',
      standaloneQuery: 'Mức phạt nồng độ cồn thấp nhất đối với người điều khiển xe ô tô',
      citations: [],
      isGrounded: true,
      createdAt: new Date(Date.now() - 3600000 * 1.9).toISOString(),
    },
    {
      id: 'msg-004',
      sessionId: 'sess-001',
      role: 'assistant',
      content: 'Căn cứ điểm c khoản 6 Điều 5 Nghị định 100/2019/NĐ-CP:\nĐối với người điều khiển xe ô tô trên đường mà trong máu hoặc hơi thở có nồng độ cồn chưa vượt quá 50 mg/100 ml máu hoặc chưa vượt quá 0,25 mg/1 l khí thở (mức thấp nhất), mức phạt tiền là từ 6.000.000 đồng đến 8.000.000 đồng, đồng thời bị tước quyền sử dụng Giấy phép lái xe từ 10 tháng đến 12 tháng.',
      standaloneQuery: null,
      citations: [
        {
          documentNumber: '100/2019/NĐ-CP',
          articleNumber: 'Điều 5',
          clauseNumber: 'Khoản 6 Điểm c',
          title: 'Xử phạt người điều khiển xe ô tô và các loại xe tương tự xe ô tô vi phạm quy tắc giao thông đường bộ',
        },
      ],
      isGrounded: true,
      createdAt: new Date(Date.now() - 3600000 * 1.8).toISOString(),
    },
  ],
  'sess-002': [
    {
      id: 'msg-005',
      sessionId: 'sess-002',
      role: 'user',
      content: 'Công ty thử việc vị trí nhân viên kinh doanh tối đa mấy tháng?',
      standaloneQuery: 'Thời gian thử việc tối đa nhân viên kinh doanh',
      citations: [],
      isGrounded: true,
      createdAt: new Date(Date.now() - 3600000 * 5).toISOString(),
    },
    {
      id: 'msg-006',
      sessionId: 'sess-002',
      role: 'assistant',
      content: 'Căn cứ khoản 2 Điều 25 Bộ luật Lao động 2019 (Luật số 45/2019/QH14):\nThời gian thử việc do hai bên thỏa thuận nhưng chỉ được thử việc 01 lần đối với một công việc và không quá 60 ngày đối với công việc có chức danh nghề nghiệp cần trình độ chuyên môn, kỹ thuật từ cao đẳng trở lên.\nĐối với công việc yêu cầu trình độ trung cấp, công nhân kỹ thuật, nhân viên nghiệp vụ thì không quá 30 ngày.\nDo đó, tùy theo yêu cầu bằng cấp chuyên môn tuyển dụng của vị trí nhân viên kinh doanh mà thời gian thử việc tối đa là 30 ngày hoặc 60 ngày.',
      standaloneQuery: null,
      citations: [
        {
          documentNumber: '45/2019/QH14',
          articleNumber: 'Điều 25',
          clauseNumber: 'Khoản 2, Khoản 3',
          title: 'Thời gian thử việc',
        },
      ],
      isGrounded: true,
      createdAt: new Date(Date.now() - 3600000 * 4.9).toISOString(),
    },
  ],
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const sessionId = searchParams.get('id');

  const supabase = getSupabaseServerClient();

  // 1. Trường hợp truy vấn tin nhắn chi tiết của 1 Session
  if (sessionId) {
    if (!supabase) {
      return NextResponse.json(mockMessagesBySession[sessionId] || []);
    }

    try {
      const { data, error } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: true });

      if (error || !data || data.length === 0) {
        return NextResponse.json(mockMessagesBySession[sessionId] || []);
      }

      const formatted: ChatMessageAdminView[] = data.map((msg) => ({
        id: String(msg.id),
        sessionId: String(msg.session_id),
        role: msg.role,
        content: msg.content,
        standaloneQuery: msg.standalone_query,
        citations: Array.isArray(msg.citations) ? msg.citations : [],
        isGrounded: msg.is_grounded ?? true,
        createdAt: msg.created_at,
      }));

      return NextResponse.json(formatted);
    } catch {
      return NextResponse.json(mockMessagesBySession[sessionId] || []);
    }
  }

  // 2. Trường hợp truy vấn danh sách tất cả các Sessions
  if (!supabase) {
    return NextResponse.json(mockSessions);
  }

  try {
    const { data: sessions, error } = await supabase
      .from('chat_sessions')
      .select('id, title, user_id, created_at, updated_at')
      .order('updated_at', { ascending: false })
      .limit(30);

    if (error || !sessions || sessions.length === 0) {
      return NextResponse.json(mockSessions);
    }

    // Đếm số lượng tin nhắn cho từng session
    const formattedSessions: ChatSessionAdminView[] = await Promise.all(
      sessions.map(async (s) => {
        const { count } = await supabase
          .from('chat_messages')
          .select('*', { count: 'exact', head: true })
          .eq('session_id', s.id);

        return {
          id: String(s.id),
          title: s.title || 'Phiên tư vấn pháp luật',
          userId: s.user_id,
          messageCount: count ?? 0,
          createdAt: s.created_at,
          updatedAt: s.updated_at,
        };
      })
    );

    return NextResponse.json(formattedSessions);
  } catch {
    return NextResponse.json(mockSessions);
  }
}
