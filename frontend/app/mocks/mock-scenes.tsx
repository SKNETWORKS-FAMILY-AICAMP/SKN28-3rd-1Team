import Image from "next/image"
import Link from "next/link"
import type { ReactNode } from "react"
import type { LucideIcon } from "lucide-react"
import { ArrowLeft, BriefcaseBusiness, FileText, List, Map, Navigation, UserRound } from "lucide-react"

import { cn } from "@/lib/utils"

export type MockScene = {
  slug: string
  title: string
  eyebrow: string
  description: string
  icon: LucideIcon
}

type Institution = {
  name: string
  badges: string[]
  phone: string
  address: string
  hours: string
  business: string
  apply: string
  docs: string
  x: number
  y: number
}

export const mockScenes: MockScene[] = [
  {
    slug: "chat-start",
    title: "로디 상담 시작",
    eyebrow: "scene 01",
    description: "상담 진입 전 로디 캐릭터를 크게 보여주는 첫 화면",
    icon: UserRound,
  },
  {
    slug: "profile-form",
    title: "상담 정보 입력",
    eyebrow: "scene 02",
    description: "태어난 년도와 사는 곳을 입력하고 추천 질문을 고르는 화면",
    icon: BriefcaseBusiness,
  },
  {
    slug: "map-results",
    title: "기관 지도 결과",
    eyebrow: "scene 03",
    description: "첫 질문 이후 강남구 수행기관을 지도 위에서 고르는 화면",
    icon: Map,
  },
  {
    slug: "list-results",
    title: "기관 목록 결과",
    eyebrow: "scene 04",
    description: "수행기관을 비교하기 쉽게 목록으로 확인하는 화면",
    icon: List,
  },
  {
    slug: "document-references",
    title: "문서 레퍼런스",
    eyebrow: "scene 05",
    description: "문서 클릭 후 근거와 요약을 메인 영역에 크게 보여주는 화면",
    icon: FileText,
  },
]

const institutions: Institution[] = [
  {
    name: "강남시니어클럽",
    badges: ["수행기관", "공익활동", "사회서비스형"],
    phone: "02-123-4567",
    address: "서울특별시 강남구 선릉로 123길 45",
    hours: "평일 09:00 - 18:00",
    business: "노인일자리 및 사회활동 지원사업 운영 (공익활동, 사회서비스형, 시장형)",
    apply: "방문 접수 또는 전화 문의 후 상담",
    docs: "신분증, 주민등록등본, 통장사본 등",
    x: 54,
    y: 48,
  },
  {
    name: "역삼노인종합복지관",
    badges: ["수행기관", "공익활동"],
    phone: "02-234-5678",
    address: "서울특별시 강남구 역삼로 200",
    hours: "평일 09:00 - 18:00",
    business: "노인 공익활동형 일자리 운영 및 지역사회 참여 지원",
    apply: "복지관 방문 접수 후 상담 진행",
    docs: "신분증, 주민등록등본",
    x: 40,
    y: 67,
  },
  {
    name: "신사종합사회복지관",
    badges: ["수행기관", "시장형사업단"],
    phone: "02-345-6789",
    address: "서울특별시 강남구 압구정로 50",
    hours: "평일 09:00 - 17:00",
    business: "시장형사업단(카페, 매장 등) 운영 및 일자리 연계",
    apply: "전화 예약 후 방문 상담",
    docs: "신분증, 통장사본",
    x: 30,
    y: 38,
  },
]

const documents = [
  {
    title: "노인일자리 사업 신청 안내",
    source: "공공 신청 안내 자료",
    category: "신청 자격",
    match: 94,
    page: "p. 6-9",
    summary: "만 60세 이상 또는 사업 유형별 참여 가능 연령, 신청 전 확인해야 할 소득·건강보험 기준, 접수 순서를 정리한 문서예요.",
    highlights: ["신분증과 주민등록등본을 기본 서류로 확인", "지역 수행기관 상담 후 세부 사업 배정", "사업 유형별 참여 조건이 다를 수 있음"],
  },
  {
    title: "강남구 수행기관 모집 공고 예시",
    source: "지자체 공고 참고 자료",
    category: "지역 기관",
    match: 88,
    page: "p. 2-4",
    summary: "강남구 안에서 상담과 접수를 맡는 수행기관 목록, 연락처, 방문 접수 기준을 확인하기 위한 자료예요.",
    highlights: ["기관별 운영 시간이 달라 방문 전 전화 확인 필요", "거주지와 가까운 기관부터 상담 권장", "모집 기간 종료 후 대기 접수가 될 수 있음"],
  },
  {
    title: "노인일자리 상담 FAQ",
    source: "상담 응대 참고 자료",
    category: "자주 묻는 질문",
    match: 81,
    page: "Q3-Q6",
    summary: "처음 신청하는 사용자가 자주 묻는 나이 조건, 다른 복지 서비스와의 중복 가능 여부, 접수 후 진행 절차를 요약했어요.",
    highlights: ["기초 정보 확인 후 상담 질문을 구체화", "사업별 중복 참여 제한 여부 확인", "접수 후 선발 결과 안내까지 시간이 걸릴 수 있음"],
  },
]

export function getMockScene(slug: string) {
  return mockScenes.find((scene) => scene.slug === slug)
}

export function MockSceneShell({ scene }: { scene: MockScene }) {
  return (
    <main className="min-h-dvh bg-[#ece7e0] text-[#332f29]">
      <header className="border-b border-[#efe7da] bg-white">
        <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-5">
          <Link href="/mocks" className="inline-flex items-center gap-2 text-sm font-bold text-[#6f665d]">
            <ArrowLeft className="size-4" />
            목업 목록
          </Link>
          <div className="h-5 w-px bg-[#eadfce]" />
          <div className="flex items-center gap-2.5">
            <span className="flex size-9 items-center justify-center overflow-hidden rounded-full bg-[#fbe6d4] ring-1 ring-[#f4d6bd]">
              <Image src="/images/mascot.png" alt="로디" width={36} height={36} className="size-9 object-cover" />
            </span>
            <span className="font-heading text-lg">로디 디자인 목업</span>
          </div>
          <div className="flex-1" />
          <Link href="/chat_page" className="rounded-[10px] border border-[#ead9c6] px-3.5 py-2 text-sm font-bold text-[#6c6359]">
            실제 상담 화면
          </Link>
        </div>
      </header>

      <div className="mx-auto flex max-w-7xl flex-col gap-5 px-5 py-5">
        <nav className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {mockScenes.map((item) => {
            const Icon = item.icon
            const active = item.slug === scene.slug

            return (
              <Link
                key={item.slug}
                href={`/mocks/${item.slug}`}
                className={cn(
                  "flex min-h-[50px] items-center gap-2.5 rounded-[12px] border px-3 py-1.5 transition",
                  active ? "border-[#f0b88e] bg-white shadow-sm" : "border-[#eadfce] bg-[#fbf6ef] hover:bg-white",
                )}
              >
                <span
                  className={cn(
                    "flex size-8 shrink-0 items-center justify-center rounded-[9px]",
                    active ? "bg-[#ef8b54] text-white" : "bg-[#f5eadc] text-[#d88951]",
                  )}
                >
                  <Icon className="size-4" />
                </span>
                <span className="min-w-0">
                  <span className="block text-[13px] font-extrabold leading-tight text-[#3f3932]">{item.title}</span>
                </span>
              </Link>
            )
          })}
        </nav>

        <section className="min-w-0 overflow-hidden rounded-[16px] border border-[#eadfce] bg-[#f6f0e8]">
          <div className="flex items-center justify-between gap-4 border-b border-[#eadfce] bg-white px-5 py-1.5">
            <div>
              <div className="text-[9px] font-extrabold uppercase tracking-wide text-[#a99c8f]">{scene.eyebrow}</div>
              <h1 className="font-heading text-lg leading-tight text-[#2f2b26]">{scene.title}</h1>
            </div>
            <p className="max-w-md text-right text-[11px] leading-tight text-[#7d7469]">{scene.description}</p>
          </div>
          {renderScene(scene.slug)}
        </section>
      </div>
    </main>
  )
}

function renderScene(slug: string) {
  if (slug === "profile-form") return <ProfileFormScene />
  if (slug === "map-results") return <MapResultsScene />
  if (slug === "list-results") return <ListResultsScene />
  if (slug === "document-references") return <DocumentReferencesScene />
  return <ChatStartScene />
}

function ChatRail({ withProgress = false }: { withProgress?: boolean }) {
  return (
    <aside className="flex w-[372px] shrink-0 flex-col border-r border-[#efe7da] bg-[#fbf6ef]">
      <div className="flex flex-1 flex-col gap-4 px-4 py-5">
        <ChatBubble role="assistant" text={"안녕하세요, 로디에요!\n궁금한 점을 편하게 물어보세요."} />
        {withProgress ? <ChatBubble role="user" text="강남구에서 신청 가능한 노인일자리 알려줘" /> : null}
      </div>
      <div className="p-4 pt-0">
        <div className="flex items-center gap-2 rounded-[14px] border border-[#ecd9c4] bg-white py-2.5 pl-4 pr-2">
          <span className="flex-1 text-sm text-[#b1a597]">메시지를 입력하세요...</span>
          <span className="flex size-10 shrink-0 items-center justify-center rounded-[11px] bg-[#ef8b54] text-white">
            <Navigation className="size-4 rotate-45" />
          </span>
        </div>
      </div>
    </aside>
  )
}

function ChatBubble({ role, text }: { role: "assistant" | "user"; text: string }) {
  const isUser = role === "user"

  return (
    <div className="flex items-start gap-2">
      <span
        className={cn(
          "flex size-[30px] shrink-0 items-center justify-center overflow-hidden rounded-full",
          isUser ? "bg-[#e8ddce] text-xs font-bold text-[#8a7c69]" : "bg-[#fbe6d4] ring-1 ring-[#f4d6bd]",
        )}
      >
        {isUser ? "나" : <Image src="/images/mascot.png" alt="" width={30} height={30} className="size-[30px] object-cover" />}
      </span>
      <div
        className={cn(
          "max-w-[276px] whitespace-pre-wrap rounded-[4px_14px_14px_14px] px-3.5 py-3 text-sm leading-relaxed",
          isUser ? "bg-[#f7e7d8] text-[#4a4038]" : "border border-[#eee3d6] bg-white text-[#403a33]",
        )}
      >
        {text}
      </div>
    </div>
  )
}

function ChatStartScene() {
  return (
    <div className="flex h-[680px] min-h-0 bg-[#ece7e0]">
      <ChatRail />
      <div className="flex min-w-0 flex-1 flex-col items-center justify-center px-10 py-8 text-center">
        <span className="flex size-[220px] items-center justify-center overflow-hidden rounded-full bg-[#fbe6d4] shadow-[inset_0_0_0_2px_#f4d6bd,0_18px_44px_rgba(239,139,84,.2)]">
          <Image src="/images/mascot.png" alt="로디" width={220} height={220} className="size-full object-cover" priority />
        </span>
        <h2 className="mt-7 text-[26px] font-extrabold text-[#2f2b26]">안녕하세요, 로디에요</h2>
        <p className="mt-1 text-[15px] leading-[1.65] text-[#8c8276]">로디를 누르고 상담 정보를 먼저 알려주세요.</p>
      </div>
    </div>
  )
}

function ProfileFormScene() {
  const questions = ["서울 강남구에서 신청 가능한 노인일자리 알려줘", "1958년생도 신청 가능한 일자리 조건 알려줘", "가장 가까운 수행기관 알려줘"]

  return (
    <div className="flex h-[680px] min-h-0 bg-[#ece7e0]">
      <ChatRail />
      <div className="flex min-w-0 flex-1 flex-col items-center justify-center px-10 py-8 text-center">
        <span className="flex size-[84px] items-center justify-center overflow-hidden rounded-full bg-[#fbe6d4] shadow-[inset_0_0_0_2px_#f4d6bd,0_10px_26px_rgba(239,139,84,.13)]">
          <Image src="/images/mascot.png" alt="로디" width={84} height={84} className="size-full object-cover" />
        </span>
        <h2 className="mt-5 text-[24px] font-extrabold text-[#2f2b26]">상담 정보를 알려주세요</h2>
        <p className="mt-3 max-w-[420px] text-[15px] leading-[1.65] text-[#8c8276]">태어난 년도와 사는 곳을 적어주시면 신청 조건과 가까운 기관을 더 잘 찾아드릴게요.</p>

        <div className="mt-6 grid w-full max-w-[520px] gap-3 sm:grid-cols-2">
          <InfoCard label="태어난 년도" value="1958" />
          <InfoCard label="사는 곳" value="서울 강남구" />
        </div>

        <div className="mt-[30px] flex w-full max-w-[520px] flex-col gap-2.5">
          {questions.map((question) => (
            <div key={question} className="flex min-h-14 items-center justify-between gap-3 rounded-[13px] border border-[#efe0cd] bg-white px-[18px] py-[15px] text-left text-[14.5px] font-semibold text-[#5b5249]">
              <span>{question}</span>
              <Navigation className="size-4 shrink-0 rotate-45 text-[#ef8b54]" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function MapResultsScene() {
  return (
    <ResultShell activeTab="map">
      <MapPreview />
    </ResultShell>
  )
}

function ListResultsScene() {
  return (
    <ResultShell activeTab="list">
      <InstitutionList />
    </ResultShell>
  )
}

function DocumentReferencesScene() {
  const selected = documents[0]

  return (
    <div className="flex h-[680px] min-h-0 bg-[#ece7e0]">
      <ChatRail withProgress />
      <div className="flex min-w-0 flex-1 flex-col p-6 pb-4">
        <SceneHeading title="상담 근거 문서" description="추천 결과에 활용한 문서와 확인 포인트를 볼 수 있어요." />
        <TabBar active="documents" />
        <div className="mt-3.5 flex min-h-0 flex-1 gap-3">
          <div className="flex min-w-0 flex-1 flex-col overflow-y-auto rounded-2xl border border-[#eadfce] bg-white px-7 py-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <span className="flex size-11 shrink-0 items-center justify-center rounded-[13px] bg-[#ef8b54] text-white">
                  <FileText className="size-5" />
                </span>
                <div className="min-w-0">
                  <h3 className="text-[30px] font-extrabold leading-tight text-[#2f2b26]">{selected.title}</h3>
                  <div className="mt-2 text-sm font-semibold text-[#9a8f82]">
                    {selected.source} · {selected.page}
                  </div>
                </div>
              </div>
              <span className="h-10 rounded-[10px] border border-[#ead9c6] bg-white px-4 py-2 text-sm font-bold text-[#6c6359]">
                문서 목록
              </span>
            </div>

            <div className="mt-4 flex flex-wrap gap-1.5">
              <span className="rounded-lg bg-[#dbe7f3] px-2.5 py-1 text-xs font-semibold text-[#4a77ad]">{selected.category}</span>
              <span className="rounded-lg bg-[#d9efe0] px-2.5 py-1 text-xs font-semibold text-[#3f9a63]">관련도 {selected.match}%</span>
            </div>

            <div className="mt-3 flex flex-col gap-3">
              <div className="flex flex-col gap-2 rounded-[14px] bg-[#fbf6ef] p-5 text-lg leading-relaxed text-[#4d463d] sm:flex-row sm:items-start sm:gap-5">
                <div className="shrink-0 text-base font-extrabold text-[#9a8f82] sm:w-32">문서 요약</div>
                <p className="min-w-0 flex-1">{selected.summary}</p>
              </div>
              <div className="flex flex-col gap-2 rounded-[14px] border border-[#efe0cd] bg-[#fffaf3] p-5 sm:flex-row sm:items-start sm:gap-5">
                <div className="shrink-0 text-base font-extrabold text-[#9a8f82] sm:w-32">답변 근거 문장</div>
                <p className="min-w-0 flex-1 text-[17px] leading-relaxed text-[#4d463d]">
                  거주지 기준 수행기관에서 상담을 먼저 받고, 사업 유형에 맞는 서류를 준비합니다.
                </p>
              </div>
            </div>

            <div className="mt-3">
              <div className="grid gap-3 lg:grid-cols-3">
                {selected.highlights.map((highlight, index) => (
                  <div key={highlight} className="rounded-[13px] border border-[#efe7da] bg-white p-4">
                    <div className="mb-2 text-xs font-bold text-[#ef8b54]">근거 {index + 1}</div>
                    <p className="text-[15px] leading-relaxed text-[#4d463d]">{highlight}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex-1" />
          </div>

          <aside className="flex w-[260px] shrink-0 flex-col gap-2 overflow-y-auto rounded-2xl border border-[#eadfce] bg-white p-3">
            {documents.map((document, index) => (
              <div
                key={document.title}
                className={cn(
                  "rounded-[12px] border p-3 text-left",
                  index === 0 ? "border-[#f0b88e] bg-[#fff7ef] shadow-sm" : "border-[#efe7da] bg-white",
                )}
              >
                <div className="flex items-start gap-2.5">
                  <span
                    className={cn(
                      "flex size-8 shrink-0 items-center justify-center rounded-[9px]",
                      index === 0 ? "bg-[#ef8b54] text-white" : "bg-[#f6eee3] text-[#ef8b54]",
                    )}
                  >
                    <FileText className="size-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-lg font-extrabold leading-snug text-[#332f29]">{document.title}</span>
                    <span className="mt-1 block text-xs font-semibold text-[#9a8f82]">
                      {document.source} · {document.page}
                    </span>
                  </span>
                </div>
              </div>
            ))}
          </aside>
        </div>
      </div>
    </div>
  )
}

function ResultShell({ activeTab, children }: { activeTab: "map" | "list"; children: ReactNode }) {
  return (
    <div className="flex h-[680px] min-h-0 bg-[#ece7e0]">
      <ChatRail withProgress />
      <div className="flex min-w-0 flex-1 flex-col p-6 pb-4">
        <SceneHeading title="강남구 노인일자리 신청 가능 기관" description="지도나 목록에서 기관을 선택하면 상세 정보를 크게 확인할 수 있어요." />
        <TabBar active={activeTab} />
        {children}
      </div>
    </div>
  )
}

function SceneHeading({ title, description }: { title: string; description: string }) {
  return (
    <>
      <h2 className="text-2xl font-extrabold tracking-tight text-[#2f2b26]">{title}</h2>
      <p className="mt-1.5 text-sm text-[#8c8276]">{description}</p>
    </>
  )
}

function TabBar({ active }: { active: "map" | "list" | "documents" }) {
  return (
    <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
      <div className="flex w-max gap-1.5 rounded-xl bg-[#f1ebe1] p-1">
        <TabItem icon={Map} label="지도" active={active === "map"} />
        <TabItem icon={List} label="목록" active={active === "list"} />
      </div>
      <span
        className={cn(
          "inline-flex h-10 items-center gap-2 rounded-[10px] border px-4 text-sm font-bold",
          active === "documents" ? "border-[#ef8b54] bg-[#ef8b54] text-white" : "border-[#ead9c6] bg-white text-[#6c6359]",
        )}
      >
        <FileText className="size-4" />
        문서 레퍼런스
      </span>
    </div>
  )
}

function TabItem({ icon: Icon, label, active }: { icon: LucideIcon; label: string; active: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-2 rounded-[9px] px-5 py-2 text-sm font-semibold", active ? "bg-white text-[#33302b] shadow-sm" : "text-[#9a8f82]")}>
      <Icon className="size-4" />
      {label}
    </span>
  )
}

function MapPreview() {
  return (
    <div className="relative mt-3.5 min-h-0 flex-1 overflow-hidden rounded-2xl border border-[#ece3d5] bg-[#eef1ec]">
      <div className="absolute inset-0 bg-linear-to-b from-[#eef1ec] to-[#edf0ea]" />
      <div className="absolute -right-[4%] -top-[6%] h-[55%] w-[40%] rotate-[-8deg] rounded-bl-[60%] bg-[#d8e6ee]" />
      <div className="absolute left-[8%] top-[18%] h-[30%] w-[26%] rounded-[40%_50%_45%_55%] bg-[#dcebd9]" />
      <div className="absolute bottom-[10%] right-[14%] h-[26%] w-[22%] rounded-[55%_45%_50%_40%] bg-[#dcebd9]" />
      <div className="absolute left-0 top-[46%] h-[9px] w-full bg-white shadow-[0_0_0_1px_#e7e2d6]" />
      <div className="absolute left-[38%] top-0 h-full w-[9px] bg-white shadow-[0_0_0_1px_#e7e2d6]" />
      <div className="absolute left-0 top-[22%] h-[5px] w-full bg-white/85" />
      <div className="absolute left-[70%] top-0 h-full w-[5px] bg-white/85" />
      <div className="absolute left-[-10%] top-[60%] h-1.5 w-[130%] origin-left rotate-[-18deg] bg-[#fbe0bf]" />

      <span className="absolute left-[26%] top-[18%] text-[11px] text-[#9aa18f]">선릉역</span>
      <span className="absolute left-[54%] top-[39%] text-[11px] text-[#9aa18f]">강남역</span>
      <span className="absolute bottom-[18%] left-[22%] text-[11px] text-[#9aa18f]">역삼역</span>

      {institutions.map((institution, index) => (
        <span
          key={institution.name}
          className={cn(
            "absolute z-10 flex -translate-x-1/2 -translate-y-full items-center justify-center rounded-full border-2 border-white text-sm font-bold text-white shadow-[0_4px_10px_rgba(0,0,0,.18)]",
            index === 0 ? "size-9 bg-[#ef8b54] ring-[5px] ring-[#ef8b54]/20" : "size-7 bg-[#5fb87f]",
          )}
          style={{ left: `${institution.x}%`, top: `${institution.y}%` }}
        >
          {index + 1}
        </span>
      ))}
    </div>
  )
}

function InstitutionList() {
  return (
    <div className="mt-3.5 flex min-h-0 flex-1 flex-col gap-2.5 overflow-y-auto pr-1">
      {institutions.map((institution, index) => (
        <div key={institution.name} className={cn("rounded-[14px] border bg-white p-4", index === 0 ? "border-[#f0b88e] shadow-[0_3px_12px_rgba(239,139,84,.14)]" : "border-[#efe7da]")}>
          <div className="flex items-center gap-2.5">
            <span className={cn("flex size-6 items-center justify-center rounded-full text-sm font-bold text-white", index === 0 ? "bg-[#ef8b54]" : "bg-[#e8ddce]")}>{index + 1}</span>
            <span className="text-base font-bold text-[#332f29]">{institution.name}</span>
          </div>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {institution.badges.map((badge) => (
              <span key={badge} className={cn("rounded-lg px-2.5 py-1 text-xs font-semibold", badgeClassName(badge))}>
                {badge}
              </span>
            ))}
          </div>
          <div className="mt-3 flex items-center gap-2 text-sm text-[#8a8073]">
            <Navigation className="size-4 text-[#ef9a52]" />
            {institution.address}
          </div>
        </div>
      ))}
    </div>
  )
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[13px] border border-[#efe0cd] bg-white px-4 py-3 text-left">
      <div className="text-xs font-extrabold text-[#9a8f82]">{label}</div>
      <div className="mt-2 text-base font-semibold text-[#403a33]">{value}</div>
    </div>
  )
}

function badgeClassName(label: string) {
  if (label === "수행기관") return "bg-[#fbe3d2] text-[#cf7838]"
  if (label === "공익활동") return "bg-[#d9efe0] text-[#3f9a63]"
  if (label === "사회서비스형") return "bg-[#dbe7f3] text-[#4a77ad]"
  if (label === "시장형사업단") return "bg-[#e9e1f2] text-[#7a64ad]"
  return "bg-[#eee5d8] text-[#8a7d6c]"
}
