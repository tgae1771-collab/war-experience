
// Fictional war-experience simulation.
// All events and characters are fictional.

export const FLOW = {
  lock_alarm_1: {
    title: '긴급 재난 안내',
    message:
      '주변 지역에 긴급 상황이 발생했습니다. 당황하지 말고 안전한 장소로 이동한 뒤 공식 안내를 확인하세요.',
    slideHint: '밀어서 화면 잠금 해제'
  },

  t1_mom_arrives: {
    themMessage:
      'ㅇㅇ아, 엄마야. 지금 상황이 심상치 않대. 우선 안전한 곳에 있는지 알려줄래?'
  },

  t2_father_arrives: {
    themMessage:
      '아빠야. 엄마에게 연락받았어. 지금은 안전한 장소에 머물면서 공식 안내를 확인하는 게 가장 중요해.'
  },

  t3_open_sns: {
    initialFeed: [
      {
        id: 'post1',
        author: '박서연',
        tag: '일상',
        caption: '갑자기 이런 상황이 생기다니 너무 당황스럽다… 다들 안전한 곳에 있지?'
      },
      {
        id: 'post2',
        author: '최도윤',
        tag: '소식',
        caption: '확인되지 않은 정보가 많이 올라오고 있어. 공식 발표를 확인하자.'
      },
      {
        id: 'post3',
        author: '김하늘',
        tag: '안내',
        caption: '주변 사람들의 안전을 확인하고 정확한 정보를 공유해 주세요.'
      }
    ],

    storyList: [
      {
        author: '서연',
        text: '다들 괜찮아?'
      },
      {
        author: '도윤',
        text: '공식 발표 확인 중'
      },
      {
        author: '하늘',
        text: '안전이 우선!'
      }
    ]
  },

  t4_alarm_2: {
    newFeed: [
      {
        id: 'post4',
        author: '공식 안내',
        tag: '안전 안내',
        caption: '현재 상황에 관한 정확한 정보는 공식 기관의 발표를 통해 확인해 주세요. 확인되지 않은 소문은 공유하지 않는 것이 좋습니다.'
      }
    ]
  },

  t5_news_breaking: {
    items: [
      {
        kind: '속보',
        title: '주변 지역 긴급 상황 발생',
        summary:
          '일부 지역에서 긴급 상황이 발생했다는 소식이 전해졌습니다. 정확한 상황은 관계 기관의 공식 발표를 통해 확인해야 합니다.'
      },
      {
        kind: '공식 발표',
        title: '시민 안전 안내',
        summary:
          '시민들은 안전한 장소에 머물고 관계 기관의 안내에 따라 행동해 주시기 바랍니다.'
      },
      {
        kind: '안내',
        title: '허위 정보 확산 주의',
        summary:
          '온라인에서 확인되지 않은 정보가 확산될 수 있습니다. 정보를 공유하기 전에 출처와 사실 여부를 확인해 주세요.'
      }
    ]
  },

  t7_reflect: {
    title: '체험을 마치며',
    questions: [
      '갑작스러운 상황에서 가장 먼저 해야 한다고 생각한 행동은 무엇인가요?',
      'SNS에서 접한 정보와 공식 뉴스의 차이를 확인하면서 어떤 점을 느꼈나요?',
      '위기 상황에서 가족과 친구들의 안전을 확인하는 것이 왜 중요할까요?',
      '이번 체험을 통해 전쟁과 평화에 대해 새롭게 생각하게 된 점은 무엇인가요?'
    ],
    submitLabel: '성찰 기록 저장하기'
  },

  ending_saved: {
    title: '체험 완료',
    text:
      '전쟁과 재난 상황에서는 정확한 정보 확인, 안전 확보, 주변 사람들과의 소통이 중요합니다.\n\n이번 체험을 통해 평범한 일상이 얼마나 소중한지 생각해 보세요.\n\n평화는 당연하게 주어지는 것이 아니라 함께 지켜 나가야 하는 가치입니다.'
  }
};

export const initialStoryState = () => ({
  node: 'lock_alarm_1',
  log: [],
  unread: {
    mom: 0,
    dad: 0,
    seoyeon: 0,
    doyun: 0
  },
  messagesView: 'list',
  activeChat: null,
  choices: {},
  sns: {
    likes: {},
    comments: {},
    shares: {},
    feed: [],
    stories: []
  },
  reflect: {
    answers: []
  }
});
