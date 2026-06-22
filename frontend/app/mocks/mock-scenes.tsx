import Image from "next/image"
import Link from "next/link"
import type { LucideIcon } from "lucide-react"
import { ArrowLeft, BriefcaseBusiness, FileText, List, Map, Navigation, Phone, UserRound } from "lucide-react"

import { cn } from "@/lib/utils"

export type MockScene = {
  slug: string
  title: string
  eyebrow: string
  description: string
  icon: LucideIcon
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
    description: "첫 질문 이후 지도, 목록, 기관 상세 카드를 보여주는 화면",
    icon: Map,
  },
  {
    slug: "document-references",
    title: "문서 레퍼런스",
    eyebrow: "scene 04",
    description: "근거 문서 목록과 선택 문서 미리보기를 보여주는 화면",
    icon: FileText,
  },
]

const institutions = [
  {
    name: "강남시니어클럽",
    badges: ["수행기관", "공익활동", "사회서비스형"],
    phone: "02-123-4567",
    address: "서울특별시 강남구 선릉로 123길 45",
    x: 54,
    y: 48,
  },
  {
    name: "역삼노인종합복지관",
    badges: ["수행기관", "공익활동"],
    phone: "02-234-5678",
    address: "서울특별시 강남구 역삼로 200",
    x: 40,
    y: 67,
  },
  {
    name: "신사종합사회복지관",
    badges: ["시장형사업단"],
    phone: "02-345-6789",
    address: "서울특별시 강남구 압구정로 50",
    x: 30,
    y: 38,
  },
]

const documents = [
  {
    title: "노인일자리 및 사회활동 지원사업 운영안내",
    organization: "보건복지부",
    type: "사업 지침",
    match: 94,
    pages: "p. 12-18",
    summary: "참여 자격, 사업 유형, 수행기관 신청 흐름을 확인할 수 있는 기준 문서입니다.",
    highlights: [
      "거주지 관할 수행기관 또는 행정복지센터를 통해 상담과 신청을 진행할 수 있습니다.",
      "사업 유형에 따라 공익활동, 사회서비스형, 시장형 등으로 나뉘며 조건이 달라질 수 있습니다.",
      "신분 확인 서류와 거주 정보 확인이 필요할 수 있습니다.",
    ],
  },
  {
    title: "강남구 노인일자리 수행기관 모집 공고 예시",
    organization: "지방자치단체",
    type: "지역 공고",
    match: 88,
    pages: "p. 2-4",
    summary: "지역별 수행기관, 접수 기간, 문의처를 함께 확인하는 공고형 문서 예시입니다.",
    highlights: [
      "기관별 모집 분야와 접수 가능 기간은 공고마다 다를 수 있습니다.",
      "방문 접수 전 전화 문의로 준비 서류와 상담 시간을 확인하는 것이 좋습니다.",
      "가까운 수행기관을 우선 확인하면 이동 부담을 줄일 수 있습니다.",
    ],
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

      <div className="mx-auto grid max-w-7xl grid-cols-[260px_1fr] gap-5 px-5 py-5">
        <aside className="flex flex-col gap-2">
          {mockScenes.map((item) => {
            const Icon = item.icon
            const active = item.slug === scene.slug
            return (
              <Link
                key={item.slug}
                href={`/mocks/${item.slug}`}
                className={cn(
                  "flex items-center gap-3 rounded-[12px] border px-3.5 py-3 transition",
                  active ? "border-[#f0b88e] bg-white shadow-sm" : "border-[#eadfce] bg-[#fbf6ef] hover:bg-white",
                )}
              >
                <span className={cn("flex size-9 items-center justify-center rounded-[10px]", active ? "bg-[#ef8b54] text-white" : "bg-[#f5eadc] text-[#d88951]")}>
                  <Icon className="size-4" />
                </span>
                <span className="min-w-0">
                  <span className="block text-[11px] font-bold uppercase text-[#a99c8f]">{item.eyebrow}</span>
                  <span className="block truncate text-sm font-extrabold text-[#3f3932]">{item.title}</span>
                </span>
              </Link>
            )
          })}
        </aside>

        <section className="min-w-0 overflow-hidden rounded-[16px] border border-[#eadfce] bg-[#f6f0e8]">
          <div className="flex items-center justify-between border-b border-[#eadfce] bg-white px-5 py-4">
            <div>
              <div className="text-xs font-extrabold uppercase tracking-wide text-[#a99c8f]">{scene.eyebrow}</div>
              <h1 className="mt-1 font-heading text-2xl text-[#2f2b26]">{scene.title}</h1>
            </div>
            <p className="max-w-md text-right text-sm leading-relaxed text-[#7d7469]">{scene.description}</p>
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
  if (slug === "document-references") return <DocumentReferencesScene />
  return <ChatStartScene />
}

function ChatRail({ withProgress = false }: { withProgress?: boolean }) {
  return (
    <aside className="flex w-[310px] shrink-0 flex-col border-r border-[#efe7da] bg-[#fbf6ef]">
      <div className="flex flex-1 flex-col gap-4 px-4 py-5">
        <div className="flex items-start gap-2">
          <span className="flex size-[30px] shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#fbe6d4] ring-1 ring-[#f4d6bd]">
            <Image src="/images/mascot.png" alt="" width={30} height={30} className="size-[30px] object-cover" />
          </span>
          <div className="max-w-[230px] whitespace-pre-wrap rounded-[4px_14px_14px_14px] border border-[#eee3d6] bg-white px-3.5 py-3 text-sm leading-relaxed text-[#403a33]">
            안녕하세요, 로디예요!
            <br />
            궁금한 점을 편하게 물어보세요.
          </div>
        </div>
        {withProgress ? (
          <div className="flex items-start gap-2">
            <span className="flex size-[30px] shrink-0 items-center justify-center rounded-full bg-[#e8ddce] text-xs font-bold text-[#8a7c69]">
              나
            </span>
            <div className="max-w-[230px] rounded-[14px_4px_14px_14px] bg-[#f7e7d8] px-3.5 py-3 text-sm leading-relaxed text-[#4a4038]">
              강남구에서 신청 가능한 노인일자리 알려줘
            </div>
          </div>
        ) : null}
      </div>
      {withProgress ? (
        <div className="mx-4 mb-3 rounded-[14px] border border-[#f0e7da] bg-white px-4 py-3.5 text-sm">
          <div className="mb-3 font-extrabold text-[#5b5249]">작업 진행 상황</div>
          {["지역 정보 확인", "수행기관 검색", "근거 문서 정리"].map((task) => (
            <div key={task} className="flex items-center gap-2 py-1">
              <span className="text-xs text-[#bfae9b]">◇</span>
              <span className="flex-1 text-[#5f574d]">{task}</span>
              <span className="text-xs font-bold text-[#42a564]">완료</span>
            </div>
          ))}
        </div>
      ) : null}
      <div className="p-4 pt-0">
        <div className="flex items-center gap-2 rounded-[14px] border border-[#ecd9c4] bg-white py-1.5 pl-4 pr-2">
          <span className="flex-1 text-sm text-[#b1a597]">메시지를 입력하세요...</span>
          <span className="flex size-10 shrink-0 items-center justify-center rounded-[11px] bg-[#ef8b54] text-white">
            <Navigation className="size-4 rotate-45" />
          </span>
        </div>
      </div>
    </aside>
  )
}

function ChatStartScene() {
  return (
    <div className="flex h-[680px] min-h-0 bg-[#ece7e0]">
      <ChatRail />
      <div className="flex min-w-0 flex-1 flex-col items-center justify-center px-10 py-8 text-center">
        <span className="flex size-[180px] items-center justify-center overflow-hidden rounded-full bg-[#fbe6d4] shadow-[inset_0_0_0_2px_#f4d6bd,0_16px_38px_rgba(239,139,84,.18)]">
          <Image src="/images/mascot.png" alt="로디" width={180} height={180} className="size-full object-cover" priority />
        </span>
        <h2 className="mt-7 text-[26px] font-extrabold text-[#2f2b26]">안녕하세요, 로디예요</h2>
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
          <div className="rounded-[13px] border border-[#efe0cd] bg-white px-4 py-3 text-left">
            <div className="text-xs font-extrabold text-[#9a8f82]">태어난 년도</div>
            <div className="mt-2 text-base font-semibold text-[#403a33]">1958</div>
          </div>
          <div className="rounded-[13px] border border-[#efe0cd] bg-white px-4 py-3 text-left">
            <div className="text-xs font-extrabold text-[#9a8f82]">사는 곳</div>
            <div className="mt-2 text-base font-semibold text-[#403a33]">서울 강남구</div>
          </div>
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
    <div className="flex h-[680px] min-h-0 bg-[#ece7e0]">
      <ChatRail withProgress />
      <div className="flex min-w-0 flex-1">
        <div className="flex min-w-0 flex-1 flex-col p-6 pb-4">
          <h2 className="text-2xl font-extrabold tracking-tight text-[#2f2b26]">강남구 노인일자리 신청 가능 기관</h2>
          <p className="mt-1.5 text-sm text-[#8c8276]">지도에서 기관을 선택하면 상세 정보를 확인할 수 있어요.</p>
          <div className="mt-5 flex w-max gap-1.5 rounded-xl bg-[#f1ebe1] p-1">
            <span className="inline-flex items-center gap-2 rounded-[9px] bg-white px-5 py-2 text-sm font-semibold text-[#33302b] shadow-sm">
              <Map className="size-4" />
              지도
            </span>
            <span className="inline-flex items-center gap-2 rounded-[9px] px-5 py-2 text-sm font-semibold text-[#9a8f82]">
              <List className="size-4" />
              목록
            </span>
            <span className="inline-flex items-center gap-2 rounded-[9px] px-5 py-2 text-sm font-semibold text-[#9a8f82]">
              <FileText className="size-4" />
              문서
            </span>
          </div>
          <div className="relative mt-3.5 min-h-0 flex-1 overflow-hidden rounded-2xl border border-[#ece3d5] bg-[#eef1ec]">
            <div className="absolute inset-0 bg-linear-to-b from-[#eef1ec] to-[#edf0ea]" />
            <div className="absolute -right-[4%] -top-[6%] h-[55%] w-[40%] rotate-[-8deg] rounded-bl-[60%] bg-[#d8e6ee]" />
            <div className="absolute left-[8%] top-[18%] h-[30%] w-[26%] rounded-[40%_50%_45%_55%] bg-[#dcebd9]" />
            <div className="absolute bottom-[10%] right-[14%] h-[26%] w-[22%] rounded-[55%_45%_50%_40%] bg-[#dcebd9]" />
            <div className="absolute left-0 top-[46%] h-[9px] w-full bg-white shadow-[0_0_0_1px_#e7e2d6]" />
            <div className="absolute left-[38%] top-0 h-full w-[9px] bg-white shadow-[0_0_0_1px_#e7e2d6]" />
            {institutions.map((institution, index) => (
              <span
                key={institution.name}
                className={cn("absolute z-10 flex -translate-x-1/2 -translate-y-full items-center justify-center rounded-full border-2 border-white text-sm font-bold text-white shadow-[0_4px_10px_rgba(0,0,0,.18)]", index === 0 ? "size-9 bg-[#ef8b54] ring-[5px] ring-[#ef8b54]/20" : "size-7 bg-[#5fb87f]")}
                style={{ left: `${institution.x}%`, top: `${institution.y}%` }}
              >
                {index + 1}
              </span>
            ))}
          </div>
        </div>
        <InstitutionPreview />
      </div>
    </div>
  )
}

function InstitutionPreview() {
  const selected = institutions[0]

  return (
    <aside className="flex w-[312px] shrink-0 flex-col p-6 pl-0">
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto rounded-2xl border border-[#efe7da] bg-white p-5">
        <div className="flex items-center gap-2.5">
          <span className="flex size-7 items-center justify-center rounded-full bg-[#ef8b54] text-sm font-bold text-white">1</span>
          <h3 className="text-lg font-extrabold text-[#2f2b26]">{selected.name}</h3>
        </div>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {selected.badges.map((badge) => (
            <span key={badge} className="rounded-lg bg-[#fbe3d2] px-2.5 py-1 text-xs font-semibold text-[#cf7838]">
              {badge}
            </span>
          ))}
        </div>
        <div className="mt-4 flex flex-col gap-3 text-sm text-[#574f46]">
          <div className="flex items-center gap-2.5">
            <Phone className="size-4 text-[#ef9a52]" />
            {selected.phone}
          </div>
          <div className="flex items-start gap-2.5">
            <Navigation className="mt-0.5 size-4 text-[#ef9a52]" />
            <span>{selected.address}</span>
          </div>
        </div>
        <div className="my-4 h-px bg-[#f0e8db]" />
        <div className="space-y-4 text-sm leading-relaxed text-[#4d463d]">
          <InfoBlock label="주요 사업" value="공익활동, 사회서비스형, 시장형 노인일자리 사업 운영" />
          <InfoBlock label="신청 방법" value="방문 접수 또는 전화 문의 후 상담" />
          <InfoBlock label="준비 서류" value="신분증, 주민등록등본, 통장사본 등" />
        </div>
      </div>
    </aside>
  )
}

function DocumentReferencesScene() {
  const selected = documents[0]

  return (
    <div className="flex h-[680px] min-h-0 bg-[#ece7e0]">
      <ChatRail withProgress />
      <div className="flex min-w-0 flex-1">
        <div className="flex min-w-0 flex-1 flex-col p-6 pb-4">
          <h2 className="text-2xl font-extrabold tracking-tight text-[#2f2b26]">상담 근거 문서</h2>
          <p className="mt-1.5 text-sm text-[#8c8276]">문서를 선택하면 오른쪽에서 핵심 근거와 요약을 확인할 수 있어요.</p>
          <div className="mt-5 flex w-max gap-1.5 rounded-xl bg-[#f1ebe1] p-1">
            <span className="inline-flex items-center gap-2 rounded-[9px] px-5 py-2 text-sm font-semibold text-[#9a8f82]">
              <Map className="size-4" />
              지도
            </span>
            <span className="inline-flex items-center gap-2 rounded-[9px] px-5 py-2 text-sm font-semibold text-[#9a8f82]">
              <List className="size-4" />
              목록
            </span>
            <span className="inline-flex items-center gap-2 rounded-[9px] bg-white px-5 py-2 text-sm font-semibold text-[#33302b] shadow-sm">
              <FileText className="size-4" />
              문서
            </span>
          </div>
          <div className="mt-3.5 flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto pr-1">
            {documents.map((document, index) => (
              <div key={document.title} className={cn("rounded-[14px] border bg-white p-4", index === 0 ? "border-[#f0b88e] shadow-[0_3px_12px_rgba(239,139,84,.14)]" : "border-[#efe7da]")}>
                <div className="flex items-start gap-3">
                  <span className={cn("flex size-9 shrink-0 items-center justify-center rounded-[10px]", index === 0 ? "bg-[#ef8b54] text-white" : "bg-[#f5eadc] text-[#d88951]")}>
                    <FileText className="size-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="rounded-[7px] bg-[#fbe3d2] px-2.5 py-1 text-xs font-bold text-[#cf7838]">{document.type}</span>
                      <span className="text-xs font-semibold text-[#9a8f82]">{document.organization}</span>
                    </div>
                    <h3 className="mt-2 text-base font-extrabold text-[#332f29]">{document.title}</h3>
                    <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-[#7c736a]">{document.summary}</p>
                    <div className="mt-3 flex items-center gap-2 text-xs font-semibold text-[#9a8f82]">
                      <span>{document.pages}</span>
                      <span className="ml-auto rounded-[7px] bg-[#d9efe0] px-2 py-1 text-[#3f9a63]">관련도 {document.match}%</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
        <aside className="flex w-[312px] shrink-0 flex-col p-6 pl-0">
          <div className="flex min-h-0 flex-1 flex-col overflow-y-auto rounded-2xl border border-[#efe7da] bg-white p-5">
            <div className="flex items-start gap-3">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-[10px] bg-[#ef8b54] text-white">
                <FileText className="size-4" />
              </span>
              <div className="min-w-0">
                <h3 className="text-lg font-extrabold leading-snug text-[#2f2b26]">{selected.title}</h3>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  <span className="rounded-lg bg-[#fbe3d2] px-2.5 py-1 text-xs font-semibold text-[#cf7838]">{selected.type}</span>
                  <span className="rounded-lg bg-[#dbe7f3] px-2.5 py-1 text-xs font-semibold text-[#4a77ad]">{selected.organization}</span>
                </div>
              </div>
            </div>
            <div className="my-4 h-px bg-[#f0e8db]" />
            <div className="rounded-[13px] bg-[#fbf6ef] p-4">
              <div className="mb-2 text-xs font-extrabold text-[#9a8f82]">문서 요약</div>
              <p className="text-sm leading-relaxed text-[#4d463d]">{selected.summary}</p>
            </div>
            <div className="mt-4 flex flex-col gap-3">
              <div className="text-xs font-extrabold text-[#9a8f82]">핵심 근거</div>
              {selected.highlights.map((highlight, index) => (
                <div key={highlight} className="rounded-[12px] border border-[#efe0cd] bg-white px-3.5 py-3">
                  <div className="mb-1.5 text-xs font-bold text-[#ef8b54]">근거 {index + 1}</div>
                  <p className="text-sm leading-relaxed text-[#4d463d]">{highlight}</p>
                </div>
              ))}
            </div>
          </div>
        </aside>
      </div>
    </div>
  )
}

function InfoBlock({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="mb-1.5 text-xs font-extrabold text-[#9a8f82]">{label}</div>
      <div>{value}</div>
    </div>
  )
}
