import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { Table, THead, TH, TBody, TR, TD, RowLink } from '@/components/ui/table'
import { priorityEdgeClass } from '@/components/ui/signal'
import { StatusLabel, SlaValue } from '@/components/ui/signal'
import { RowSkeleton, EmptyState, ErrorState } from '@/components/ui/primitives'
import type { SlaView } from '@/modules/tickets/sla-display'
import { Button } from '@/components/ui/button'

const sla: SlaView = {
  tone: 'warning',
  short: '18ד׳',
  long: 'תגובה עד 12:10',
  phase: 'respond',
  dueAt: null,
  remainingMs: 18 * 60_000,
}

const meta = {
  title: 'OQ/Table',
  component: Table,
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof Table>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  render: () => (
    <div className="overflow-x-auto bg-surface">
      <Table>
        <THead>
          <TH sort={{ href: '#', active: true, direction: 'desc' }}>מספר</TH>
          <TH>תיאור</TH>
          <TH>סטטוס</TH>
          <TH align="end">SLA</TH>
        </THead>
        <TBody>
          <TR edgeClass={priorityEdgeClass('critical')}>
            <TD className="relative">
              <RowLink href="#" label="OC-1001">
                <span className="t-num t-body text-ink">OC-1001</span>
              </RowLink>
            </TD>
            <TD>
              <span className="t-body text-ink">דלת חירום תקועה</span>
            </TD>
            <TD>
              <StatusLabel status="waiting_parts" />
            </TD>
            <TD align="end">
              <SlaValue
                view={{
                  ...sla,
                  tone: 'critical',
                  short: 'באיחור 5ד׳',
                }}
              />
            </TD>
          </TR>
          <TR edgeClass={priorityEdgeClass('medium')}>
            <TD className="relative">
              <RowLink href="#" label="OC-1042">
                <span className="t-num t-body text-ink">OC-1042</span>
              </RowLink>
            </TD>
            <TD>
              <span className="t-body text-ink">מזגן לא מקרר</span>
            </TD>
            <TD>
              <StatusLabel status="in_progress" />
            </TD>
            <TD align="end">
              <SlaValue view={sla} />
            </TD>
          </TR>
        </TBody>
      </Table>
    </div>
  ),
}

export const Loading: Story = {
  render: () => <RowSkeleton rows={6} />,
}

export const Empty: Story = {
  render: () => (
    <EmptyState title="אין שורות" description="הטבלה ריקה" />
  ),
}

export const Error: Story = {
  render: () => (
    <div className="p-4">
      <ErrorState
        title="טעינת הטבלה נכשלה"
        description="נסו לרענן"
        action={<Button variant="secondary">רענון</Button>}
      />
    </div>
  ),
}

export const CriticalRow: Story = {
  render: () => (
    <div className="overflow-x-auto bg-surface">
      <Table>
        <THead>
          <TH>מספר</TH>
          <TH>תיאור</TH>
          <TH align="end">SLA</TH>
        </THead>
        <TBody>
          <TR
            edgeClass={priorityEdgeClass('critical')}
            className="bg-[var(--signal-critical-soft)]/45"
          >
            <TD>
              <span className="t-num t-body">OC-1001</span>
            </TD>
            <TD>
              <span className="t-body-strong text-[var(--signal-critical)]">
                חריגת SLA — דלת חירום
              </span>
            </TD>
            <TD align="end">
              <SlaValue
                view={{
                  tone: 'critical',
                  short: 'באיחור 1ש׳',
                  long: 'חריגה',
                  phase: 'resolve',
                  dueAt: null,
                  remainingMs: -3_600_000,
                }}
              />
            </TD>
          </TR>
        </TBody>
      </Table>
    </div>
  ),
}
