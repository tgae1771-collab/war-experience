// src/apps.js
import { FLOW, initialStoryState } from './story.js';

const FLOW_ID = 'flow';

function safeParse(json, fallback) {
  try {
    const v = JSON.parse(json);
    return v ?? fallback;
  } catch {
    return fallback;
  }
}

function getFlowState() {
  const raw = localStorage.getItem(FLOW_ID);
  return raw ? safeParse(raw, initialStoryState()) : initialStoryState();
}

function setFlowState(state) {
  localStorage.setItem(FLOW_ID, JSON.stringify(state));
}

// ------- helpers required by this file -------

function escapeText(str) {
  return String(str)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function updateClock(el) {
  if (!el) return;
  const tick = () => {
    const d = new Date();
    const hh = String(d.getHours()).padStart(2, '0');
    const mm = String(d.getMinutes()).padStart(2, '0');
    el.textContent = `${hh}:${mm}`;
  };
  tick();
  clearInterval(el.__t);
  el.__t = setInterval(tick, 1000);
}

function setFlowToNodeAndPersist(state, setNode, nodeId) {
  state.node = nodeId;
  setNode?.(nodeId);
  setFlowState(state);
}

function renderStoryStrip(stories) {
  if (!stories?.length) return `<div class="storyStrip empty">스토리가 없습니다</div>`;
  return `
    <div class="storyStrip">
      ${stories
        .map(
          (s) => `
        <div class="storyBubble">
          <div class="storyAuthor">${escapeText(s.author)}</div>
          <div class="storyText">${escapeText(s.text)}</div>
        </div>`
        )
        .join('')}
    </div>
  `;
}

function showCommentPicker(root, { onPick }) {
  const picker = document.createElement('div');
  picker.className = 'modalOverlay';
  picker.innerHTML = `
    <div class="modal">
      <div class="modalTitle">서연의 게시물에 댓글을 선택하세요</div>
      <div class="modalList">
        <button class="btn modalChoice" type="button" data-text="일단 서로 안전한지 확인하자.">일단 서로 안전한지 확인하자.</button>
        <button class="btn modalChoice" type="button" data-text="공식 발표 확인 전엔 공유를 멈추자.">공식 발표 확인 전엔 공유를 멈추자.</button>
        <button class="btn modalChoice" type="button" data-text="힘들어도 오늘은 버텨보자…">힘들어도 오늘은 버텨보자…</button>
      </div>
      <div class="modalActions">
        <button class="btn" id="closeCommentPicker" type="button">닫기</button>
      </div>
    </div>
  `;
  root.appendChild(picker);

  const close = () => picker.remove();
  picker.querySelector('#closeCommentPicker')?.addEventListener('click', close);
  picker.addEventListener('pointerdown', (e) => {
    if (e.target === picker) close();
  });

  picker.querySelectorAll('.modalChoice').forEach((b) => {
    b.addEventListener('click', () => {
      const text = b.getAttribute('data-text') || '';
      onPick(text);
      close();
    });
  });
}

// ------- apps -------

export function registerApps(core) {
  // core가 provide하는 state를 100% 신뢰하기보다, 이 파일 내부에서도 state를 쓰되
  // ctx.state가 이미 있으면 그걸 사용합니다.
  const apps = {
    lock: {
      id: 'lock',
      title: '잠금화면',
      render(root, ctx) {
        const { state, openApp, setNode } = ctx;
        root.innerHTML = `
          <div class="app lockApp">
            <div class="lockTop">
              <div class="clock" id="lock-clock"></div>
              <div class="lockStatus">긴급</div>
            </div>

            <div class="alarmCard">
              <div class="alarmTitle">${escapeText(FLOW.lock_alarm_1.title)}</div>
              <pre class="alarmMsg">${escapeText(FLOW.lock_alarm_1.message)}</pre>
            </div>

            <div class="unlockArea">
              <div class="slideTrack" id="slide-track">
                <div class="slideFill" id="slide-fill" style="width:0%"></div>
                <div class="slideKnob" id="slide-knob">→</div>
                <div class="slideHint">${escapeText(FLOW.lock_alarm_1.slideHint)}</div>
              </div>
              <button class="unlockFallbackBtn" id="unlock-fallback" type="button">
                해제(보조)
              </button>
            </div>
          </div>
        `;

        updateClock(root.querySelector('#lock-clock'));

        const track = root.querySelector('#slide-track');
        const knob = root.querySelector('#slide-knob');
        const fill = root.querySelector('#slide-fill');

        let dragging = false;

        const rect = () => track.getBoundingClientRect();
        const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

        function setProgress(p) {
          const r = rect();
          const travel = r.width - knob.offsetWidth - 8;
          const x = clamp(p * travel, 0, travel);
          knob.style.transform = `translateX(${x}px)`;
          fill.style.width = `${p * 100}%`;
        }

        function reset() {
          knob.style.transform = 'translateX(0px)';
          fill.style.width = '0%';
        }

        function completeUnlock() {
          setProgress(1);
          setTimeout(() => {
            // lock -> t1_mom_arrives
            // unread 초기: mom=1 켬
            state.unread = state.unread || { mom: 0, dad: 0, seoyeon: 0, doyun: 0 };
            state.unread.mom = 1;
            state.unread.dad = state.unread.dad ?? 0;
            state.unread.seoyeon = state.unread.seoyeon ?? 0;
            state.unread.doyun = state.unread.doyun ?? 0;

            setFlowToNodeAndPersist(state, setNode, 't1_mom_arrives');
            openApp('messages');
          }, 200);
        }

        track.addEventListener('pointerdown', (e) => {
          dragging = true;
          track.setPointerCapture?.(e.pointerId);
        });

        track.addEventListener('pointermove', (e) => {
          if (!dragging) return;
          const r = rect();
          const p = (e.clientX - r.left) / r.width;
          setProgress(clamp(p, 0, 1));
        });

        track.addEventListener('pointerup', () => {
          if (!dragging) return;
          dragging = false;

          const w = parseFloat(fill.style.width) || 0;
          const p = w / 100;

          if (p >= 0.7) completeUnlock();
          else reset();
        });

        root.querySelector('#unlock-fallback')?.addEventListener('click', completeUnlock);
      }
    },

    messages: {
      id: 'messages',
      title: '메시지',
      render(root, ctx) {
        const { state, openApp, setNode } = ctx;

        state.unread = state.unread || { mom: 0, dad: 1, seoyeon: 0, doyun: 0 };
        // 사용자 답변 반영:
        // - mom 켬은 lock에서 세팅
        // - dad는 t2에서 켜야 하는데, 여기서는 초기 안전값만
        //   (t2_father_arrives 진입 시 dad=1로 올리는 로직은 아래에 넣음)

        // unread 상태 노드 기반 반영(누적 유지)
        if (state.node === 't2_father_arrives') {
          // 켬 / 누적 유지: dad=1로 세팅하되 mom/seoyeon/doyun은 건드리지 않음
          state.unread.dad = Math.max(state.unread.dad ?? 0, 1);
          setFlowState(state);
        }

        if (state.node === 't4_to_messages_refresh') {
          // 누적 유지: mom/dad 건드리지 말고 seoyeon/doyun만 1로 세팅
          state.unread.seoyeon = Math.max(state.unread.seoyeon ?? 0, 1);
          state.unread.doyun = Math.max(state.unread.doyun ?? 0, 1);
          setFlowState(state);
        }

        
const view = state.node === 't6_last_contact'
  ? 'chat:mom'
  : (state.messagesView || 'list');

const chat = state.node === 't6_last_contact'
  ? 'mom'
  : (state.activeChat || null);

if (state.node === 't6_last_contact') {
  state.activeChat = 'mom';
  state.messagesView = 'chat:mom';
  state.unread.mom = 0;
  setFlowState(state);
}

        const unreadTotal =
          (state.unread.mom || 0) +
          (state.unread.dad || 0) +
          (state.unread.seoyeon || 0) +
          (state.unread.doyun || 0);

        // chat 열면 unread 즉시 0
        if (view.startsWith('chat:') && chat) {
          if ((state.unread[chat] ?? 0) !== 0) {
            state.unread[chat] = 0;
            setFlowState(state);
          }
        }

        root.innerHTML = `
          <div class="app messagesApp">
            <div class="messagesHeader">
              <div class="messagesTitle">메시지</div>
              <div class="messagesBadge">${unreadTotal > 0 ? `${unreadTotal}개 알림` : '알림 없음'}</div>
            </div>

            ${
              view === 'list'
                ? renderMessageList(state)
                : renderChatView(state, chat)
            }

            <div class="messagesFooter">
              <button class="btn" id="backToList" type="button">목록</button>
            </div>
          </div>
        `;

        root.querySelector('#backToList')?.addEventListener('click', () => {
          state.messagesView = 'list';
          state.activeChat = null;
          setFlowState(state);
          openApp('messages');
        });

        // 목록 카드 오픈
        if (view === 'list') {
          ['mom', 'dad', 'seoyeon', 'doyun'].forEach((k) => {
            root.querySelector(`#open-${k}`)?.addEventListener('click', () => {
              state.activeChat = k;
              state.messagesView = `chat:${k}`;
              // unread 즉시 0 처리(렌더 상단 로직에서도 처리됨)
              state.unread[k] = 0;
              setFlowState(state);
              openApp('messages');
            });
          });
        }

        // 채팅 내부 선택 처리(엄마 선택 -> 아빠로, 아빠 확인 -> sns로)
        if (view.startsWith('chat:') && chat) {
          if (chat === 'mom' && state.node === 't1_mom_arrives') {
            root.querySelectorAll('[data-mom-choice]').forEach((el) => {
              el.addEventListener('click', () => {
                const choiceId = el.getAttribute('data-mom-choice');
                state.choices = state.choices || {};
                state.choices.momReplyType = choiceId === 'mom_choice_check' ? 'check' : 'reassure';

                // 다음 노드
                setFlowToNodeAndPersist(state, setNode, 't2_father_arrives');
                // dad unread 켬(누적 유지) - 즉시 반영
                state.unread.dad = Math.max(state.unread.dad ?? 0, 1);
                setFlowState(state);

                // 아빠 채팅으로 넘기기(UX)
                state.activeChat = 'dad';
                state.messagesView = 'chat:dad';
                state.unread.dad = 0; // 즉시 0
                setFlowState(state);

                openApp('messages');
              });
            });
          }

          if (chat === 'dad' && state.node === 't2_father_arrives') {
            root.querySelectorAll('[data-father-confirm]').forEach((el) => {
              el.addEventListener('click', () => {
                setFlowToNodeAndPersist(state, setNode, 't3_open_sns');
                state.unread.dad = 0;
                setFlowState(state);
                openApp('sns');
              });
            });
          }

          // t4_to_messages_refresh: 목록/채팅 상관없이 “확인 완료” 버튼으로 t6_last_contact
          root.querySelector('#refreshContinueInChat')?.addEventListener('click', () => {
            setFlowToNodeAndPersist(state, setNode, 't6_last_contact');
            setFlowState(state);
            openApp('messages');
          });

          root.querySelector('#lastContactContinueBtn')?.addEventListener('click', () => {
            setFlowToNodeAndPersist(state, setNode, 't7_reflect');
            setFlowState(state);
            openApp('reflect');
          });
        }

        function renderMessageList(stateLocal) {
          const unread = stateLocal.unread || {};
          const card = (id, title, subtitle) => {
            const u = unread[id] || 0;
            const badge = u > 0 ? `<span class="unreadBadge">${u}</span>` : `<span class="unreadBadge empty"></span>`;
            return `
              <button class="chatCard" id="open-${id}" type="button">
                <div class="chatCardLeft">
                  <div class="chatTitle">${escapeText(title)}</div>
                  <div class="chatSubtitle">${escapeText(subtitle)}</div>
                </div>
                <div class="chatCardRight">${badge}</div>
              </button>
            `;
          };

          return `
            <div class="messagesList">
              ${card('mom', '엄마 김민정', '상황 확인 메시지')}
              ${card('dad', '아빠 이준호', '연락 상황')}
              ${card('seoyeon', '박서연', '새 알림')}
              ${card('doyun', '최도윤', '새 알림')}
            </div>
          `;
        }

        function renderChatView(stateLocal, chatId) {
          const node = stateLocal.node;
          const unread = stateLocal.unread || {};
          const momReplyType = stateLocal.choices?.momReplyType || null;
          const newsOrder = stateLocal.choices?.newsOrder || null;

          let title = '';
          let body = '';

          const unreadBadge = unread[chatId] > 0 ? `<span class="unreadBadge inline">${unread[chatId]}</span>` : '';

          if (chatId === 'mom') {
            title = '엄마 김민정';
            const replyHint =
              momReplyType === 'check'
                ? '엄마는 잠깐 숨을 고른 뒤, 연락이 되는 범위에서 위치를 알려줬어.'
                : '엄마는 안심시키는 말과 함께, 안전한 곳으로 더 집중하라고 했어.';

            body = `
              <div class="bubble them">${escapeText(FLOW.t1_mom_arrives.themMessage)}</div>
              ${
                momReplyType
                  ? `<div class="bubble me">${
                      momReplyType === 'reassure' ? escapeText('응, 나 괜찮아. 대피 먼저 할게.') : escapeText('엄마, 지금 위치가 어디야? 아빠는 계셔?')
                    }</div>`
                  : ''
              }
              ${momReplyType ? `<div class="bubble them">${escapeText(replyHint)}</div>` : ''}
            `;
          } else if (chatId === 'dad') {
            title = '아빠 이준호';
            const dadHint =
              stateLocal.choices?.momReplyType === 'check'
                ? '아빠는 가족의 안전 확인이 우선이라고 강조했어.'
                : '아빠는 연락이 끊기더라도 대피가 먼저라고 말했어.';

            body = `
              <div class="bubble them">${escapeText(FLOW.t2_father_arrives.themMessage)}</div>
              ${
                stateLocal.choices?.momReplyType
                  ? `<div class="bubble them">${escapeText(dadHint)}</div>`
                  : ''
              }
            `;
          } else if (chatId === 'seoyeon') {
            title = '박서연';
            body = `<div class="bubble them">창문 닫고 뉴스 켜놨어…</div>`;
          } else if (chatId === 'doyun') {
            title = '최도윤';
            body = `<div class="bubble them">전화 연결이 진짜 안 돼. 공식 발표만 기다리자…</div>`;
          }

          const extra =
            node === 't1_mom_arrives' && chatId === 'mom'
              ? `
                <div class="chatChoices">
                  <div class="chatChoiceTitle">엄마의 메시지에 답하기</div>
                  <button class="btn" data-mom-choice="mom_choice_reassure" type="button">
                    응, 나 괜찮아. 대피 먼저 할게.
                  </button>
                  <button class="btn" data-mom-choice="mom_choice_check" type="button">
                    엄마, 지금 위치가 어디야? 아빠는 계셔?
                  </button>
                </div>
              `
              : node === 't2_father_arrives' && chatId === 'dad'
              ? `
                <div class="chatChoices">
                  <div class="chatChoiceTitle">대화 이어가기</div>
                  <button class="btn" data-father-confirm="yes" type="button">
                    응. 안전한 곳에 있어. 아빠도 연락돼?
                  </button>
                </div>
              `
              : node === 't4_to_messages_refresh'
              ? `
                <div class="chatChoices">
                  <div class="chatChoiceTitle">새 알림 확인 완료</div>
                  <button class="btn primary" id="refreshContinueInChat" type="button">
                    메시지를 확인했어요.
                  </button>
                </div>
              `
              : node === 't6_last_contact'
              ? `
                <div class="chatChoices">
                  <div class="chatChoiceTitle">정리</div>
                  <button class="btn primary" id="lastContactContinueBtn" type="button">
                    확인했습니다. 체험을 마칠게요.
                  </button>
                </div>
              `
              : '';

          return `
            <div class="chatView">
              <div class="chatTop">
                <div class="chatHeader">
                  <div class="chatTitle">${escapeText(title)}</div>
                  ${unreadBadge}
                </div>
                <div class="chatMeta">
                  <div class="chatMetaLine">현재 단계: ${escapeText(node)}</div>
                  ${
                    newsOrder
                      ? `<div class="chatMetaLine">뉴스 확인: ${
                          newsOrder === 'breaking_first' ? '속보 우선' : '공식 우선'
                        }</div>`
                      : ''
                  }
                </div>
              </div>

              <div class="chatBody">
                ${body}
                ${extra}
              </div>

              <div class="chatBottomHint">${escapeText('메시지를 열어봤어요. 알림은 즉시 사라집니다.')}</div>
            </div>
          `;
        }
      }
    },

    sns: {
      id: 'sns',
      title: '인스타그램',
      render(root, ctx) {
        const { state, openApp, setNode } = ctx;

        if (!state.sns) {
          state.sns = { likes: {}, comments: {}, shares: {}, feed: [], stories: [] };
        }

        // seed at t3_open_sns
        if (state.node === 't3_open_sns' && state.snsSeeded !== 't3_open_sns') {
          state.sns.feed = FLOW.t3_open_sns.initialFeed.map((p) => ({ ...p }));
          state.sns.stories = FLOW.t3_open_sns.storyList.map((s) => ({ ...s }));
          state.snsSeeded = 't3_open_sns';
          setFlowState(state);
        }

        // append new item at t4_alarm_2 exactly once
        if (state.node === 't4_alarm_2' && state.snsSeeded !== 't4_alarm_2') {
          state.sns.feed = state.sns.feed || [];
          const newItem = FLOW.t4_alarm_2.newFeed[0];
          const exists = state.sns.feed.some((x) => x.id === newItem.id);
          if (!exists) state.sns.feed.unshift({ ...newItem });
          state.snsSeeded = 't4_alarm_2';
          setFlowState(state);
        }

        const feed = state.sns.feed || [];
        const stories = state.sns.stories || [];

        // bottom flow buttons based on node
        const bottomControls =
          state.node === 't3_open_sns'
            ? `
              <div class="snsBottomControls">
                <button class="btn primary" id="toAlarm2" type="button">2차 재난문자 받기</button>
              </div>
            `
            : state.node === 't4_alarm_2'
            ? `
              <div class="snsBottomControls">
                <button class="btn primary" id="toNewsPhase" type="button">뉴스 단계로</button>
              </div>
            `
            : '';

        root.innerHTML = `
          <div class="app snsApp">
            <div class="snsHeader">
              <button class="btn" id="toMessages" type="button">메시지</button>
              <div class="snsTitle">인스타그램</div>
              <button class="btn" id="toNews" type="button">뉴스</button>
            </div>

            ${renderStoryStrip(stories)}

${bottomControls}

<div class="snsFeed">
  ${feed
    .map((post) => {
                  const liked = !!state.sns.likes?.[post.id];
                  const shared = !!state.sns.shares?.[post.id];
                  const comments = state.sns.comments?.[post.id] || [];

                  // 댓글은 서연(post1)만 선택형으로 받기
                  const canComment = post.id === 'post1';

                  return `
                    <div class="snsPost" data-post="${post.id}">
                      <div class="snsPostTop">
                        <div class="author">${escapeText(post.author)}</div>
                        <div class="tag">${escapeText(post.tag || '')}</div>
                      </div>

                      <div class="caption">${escapeText(post.caption)}</div>

                      <div class="snsActions">
                        <button class="actionBtn" data-act="like" data-post="${post.id}" type="button">
                          ${liked ? '♥ 좋아요됨' : '♡ 좋아요'}
                        </button>

                        <button class="actionBtn" data-act="share" data-post="${post.id}" type="button">
                          ${shared ? '↗ 공유됨' : '↗ 공유'}
                        </button>

                        ${
                          canComment
                            ? `<button class="actionBtn commentBtn" data-act="comment" data-post="${post.id}" type="button">💬 댓글</button>`
                            : `<button class="actionBtn" type="button" disabled title="이 게시물에는 댓글이 제한되어 있어요.">💬 댓글</button>`
                        }
                      </div>

                      ${
                        comments.length
                          ? `<div class="snsComments">
                              ${comments
                                .map(
                                  (c) => `
                                <div class="snsComment">
                                  <span class="snsCommentBy">${escapeText(c.by)}:</span>
                                  <span class="snsCommentText">${escapeText(c.text)}</span>
                                </div>`
                                )
                                .join('')}
                            </div>`
                          : `<div class="snsComments empty">댓글이 아직 없어요.</div>`
                      }
                    </div>
                  `;
                })
                .join('')}
            </div>

           
          </div>
        `;

        root.querySelector('#toMessages')?.addEventListener('click', () => openApp('messages'));
        root.querySelector('#toNews')?.addEventListener('click', () => openApp('news'));

        // like/share handlers
        root.querySelectorAll('[data-act="like"]').forEach((btn) => {
          btn.addEventListener('click', () => {
            const postId = btn.getAttribute('data-post');
            state.sns.likes = state.sns.likes || {};
            state.sns.likes[postId] = !state.sns.likes[postId];
            setFlowState(state);
            openApp('sns');
          });
        });

        root.querySelectorAll('[data-act="share"]').forEach((btn) => {
          btn.addEventListener('click', () => {
            const postId = btn.getAttribute('data-post');
            state.sns.shares = state.sns.shares || {};
            state.sns.shares[postId] = true;
            setFlowState(state);
            openApp('sns');
          });
        });

        // comment picker (post1 only)
        root.querySelectorAll('.commentBtn').forEach((btn) => {
          btn.addEventListener('click', () => {
            const postId = btn.getAttribute('data-post');
            if (postId !== 'post1') return;

            showCommentPicker(root, {
              onPick: (text) => {
                state.sns.comments = state.sns.comments || {};
                state.sns.comments[postId] = state.sns.comments[postId] || [];

                // 1회 선택만 표시(중복 방지: 사용자가 이미 선택했으면 추가 안 함)
                const already = state.sns.comments[postId].some((c) => c.by === '나');
                if (!already) state.sns.comments[postId].push({ by: '나', text });

                // story-level 기록(선택형)
                state.commentChoicePost1 = text;

                setFlowState(state);
                openApp('sns');
              }
            });
          });
        });

        // --- KEY: flow buttons for t3 -> t4_alarm_2 -> t5_news_breaking ---
        root.querySelector('#toAlarm2')?.addEventListener('click', () => {
          // t3_open_sns -> t4_alarm_2
          setFlowToNodeAndPersist(state, setNode, 't4_alarm_2');
          setFlowState(state);
          openApp('sns');
        });

        root.querySelector('#toNewsPhase')?.addEventListener('click', () => {
          // t4_alarm_2 -> t5_news_breaking
          setFlowToNodeAndPersist(state, setNode, 't5_news_breaking');
          setFlowState(state);
          openApp('news');
        });

      }
    },

    news: {
      id: 'news',
      title: '뉴스',
      render(root, ctx) {
        const { state, openApp, setNode } = ctx;

        if (state.node !== 't5_news_breaking') {
          root.innerHTML = `
            <div class="app newsApp">
              <div class="newsHeader">
                <button class="btn" id="goSns" type="button">인스타</button>
                <div class="snsTitle">뉴스</div>
              </div>
              <div class="newsBody">
                <p>인스타그램에서 다음 단계로 진행해주세요.</p>
                <button class="btn primary" id="goSns2" type="button">인스타로 이동</button>
              </div>
            </div>
          `;
          root.querySelector('#goSns')?.addEventListener('click', () => openApp('sns'));
          root.querySelector('#goSns2')?.addEventListener('click', () => openApp('sns'));
          return;
        }

        const items = FLOW.t5_news_breaking.items;

        root.innerHTML = `
          <div class="app newsApp">
            <div class="newsHeader">
              <button class="btn" id="backToSns" type="button">인스타</button>
              <div class="snsTitle">뉴스</div>
              <button class="btn" id="toMessagesFromNews" type="button">메시지</button>
            </div>

            <div class="newsList">
              ${items
                .map(
                  (it) => `
                <div class="newsItem">
                  <div class="newsKind">${escapeText(it.kind)}</div>
                  <div class="newsTitle">${escapeText(it.title)}</div>
                  <div class="newsSummary">${escapeText(it.summary)}</div>
                </div>`
                )
                .join('')}
            </div>

            <div class="newsChoices">
              <button class="btn primary" id="newsBreakFirst" type="button">속보부터 확인</button>
              <button class="btn primary" id="newsOfficialFirst" type="button">공식 발표부터 확인</button>
            </div>
          </div>
        `;

        root.querySelector('#backToSns')?.addEventListener('click', () => openApp('sns'));
        root.querySelector('#toMessagesFromNews')?.addEventListener('click', () => openApp('messages'));

       root.querySelector('#newsBreakFirst')?.addEventListener('click', () => {
  state.choices = state.choices || {};
  state.choices.newsOrder = 'breaking_first';
  setFlowToNodeAndPersist(state, setNode, 't6_last_contact');

    state.activeChat = 'mom';
state.messagesView = 'chat:mom';
state.node = 't6_last_contact';

setFlowState(state);
openApp('messages');
});

        root.querySelector('#newsOfficialFirst')?.addEventListener('click', () => {
  state.choices = state.choices || {};
  state.choices.newsOrder = 'official_first';
  setFlowToNodeAndPersist(state, setNode, 't6_last_contact');

  state.activeChat = 'mom';
state.messagesView = 'chat:mom';
state.node = 't6_last_contact';

setFlowState(state);
openApp('messages');
});
      }
    },

    reflect: {

      id: 'reflect',
      title: '성찰',
      render(root, ctx) {
        const { state, openApp, setNode } = ctx;

        if (state.node !== 't7_reflect' && state.node !== 'ending_saved') {
          root.innerHTML = `
            <div class="app reflectApp">
              <div class="messagesHeader">
                <div class="messagesTitle">성찰</div>
                <div class="messagesBadge">진행 후 들어오세요</div>
              </div>
              <div class="newsBody">
                <button class="btn primary" id="goMessages" type="button">메시지로</button>
              </div>
            </div>
          `;
          root.querySelector('#goMessages')?.addEventListener('click', () => openApp('messages'));
          return;
        }

        if (state.node === 'ending_saved') {
          root.innerHTML = `
            <div class="app reflectApp">
              <div class="messagesHeader">
                <div class="messagesTitle">${escapeText(FLOW.ending_saved.title)}</div>
                <div class="messagesBadge">완료</div>
              </div>
              <div class="newsBody">
                <pre class="alarmMsg">${escapeText(FLOW.ending_saved.text)}</pre>
                <button class="btn primary" id="restart" type="button">처음부터</button>
              </div>
            </div>
          `;
          root.querySelector('#restart')?.addEventListener('click', () => {
            localStorage.removeItem(FLOW_ID);
            openApp('lock');
          });
          return;
        }

        const questions = FLOW.t7_reflect.questions;
        const answers = state.reflect?.answers || Array(questions.length).fill('');

        root.innerHTML = `
          <div class="app reflectApp">
            <div class="messagesHeader">
              <div class="messagesTitle">${escapeText(FLOW.t7_reflect.title)}</div>
              <div class="messagesBadge">기록하기</div>
            </div>

            <div class="reflectBody">
              ${questions
                .map(
                  (q, i) => `
                <div class="reflectQ">
                  <div class="reflectQTitle">${i + 1}. ${escapeText(q)}</div>
                  <textarea class="reflectInput" data-q="${i}" rows="3" placeholder="답을 입력하세요...">${escapeText(
                    answers[i] ?? ''
                  )}</textarea>
                </div>`
                )
                .join('')}
            </div>

            <div class="reflectFooter">
              <button class="btn primary" id="submitReflect" type="button">
                ${escapeText(FLOW.t7_reflect.submitLabel)}
              </button>
            </div>
          </div>
        `;

        root.querySelector('#submitReflect')?.addEventListener('click', () => {
          const next = Array(questions.length).fill('');
          root.querySelectorAll('.reflectInput').forEach((ta) => {
            const i = parseInt(ta.getAttribute('data-q'), 10);
            next[i] = (ta.value || '').trim().slice(0, 400);
          });

          state.reflect = state.reflect || {};
          state.reflect.answers = next;
          setFlowState(state);

          setFlowToNodeAndPersist(state, setNode, 'ending_saved');
          openApp('reflect');
        });
      }
    }
  }

  return apps;
}
