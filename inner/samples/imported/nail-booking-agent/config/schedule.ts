// @shared

export interface DaySchedule {
  isOpen: boolean
  start: string | null
  end: string | null
  breaks: Array<{
    start: string
    end: string
  }>
}

export interface ScheduleConfig {
  workingHours: {
    [key: string]: DaySchedule
  }
  timeSlotDuration: number
  bookingAdvanceDays: number
}

export const scheduleConfig: ScheduleConfig = {
  workingHours: {
    monday: {
      isOpen: true,
      start: '10:00',
      end: '20:00',
      breaks: [
        {
          start: '14:00',
          end: '15:00'
        }
      ]
    },
    tuesday: {
      isOpen: true,
      start: '10:00',
      end: '20:00',
      breaks: [
        {
          start: '14:00',
          end: '15:00'
        }
      ]
    },
    wednesday: {
      isOpen: true,
      start: '10:00',
      end: '20:00',
      breaks: [
        {
          start: '14:00',
          end: '15:00'
        }
      ]
    },
    thursday: {
      isOpen: true,
      start: '10:00',
      end: '20:00',
      breaks: [
        {
          start: '14:00',
          end: '15:00'
        }
      ]
    },
    friday: {
      isOpen: true,
      start: '10:00',
      end: '20:00',
      breaks: [
        {
          start: '14:00',
          end: '15:00'
        }
      ]
    },
    saturday: {
      isOpen: true,
      start: '11:00',
      end: '18:00',
      breaks: []
    },
    sunday: {
      isOpen: false,
      start: null,
      end: null,
      breaks: []
    }
  },
  timeSlotDuration: 30,
  bookingAdvanceDays: 14
}
