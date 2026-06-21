// @shared

export enum EpisodeStatus {
  Scheduled = 'scheduled',
  WaitingRoom = 'waiting_room',
  Live = 'live',
  Finished = 'finished'
}

export enum ChatAccessMode {
  Open = 'open',
  AuthOnly = 'auth-only',
  Disabled = 'disabled'
}

export enum ChatBanType {
  Timeout = 'timeout',
  Permanent = 'permanent'
}

export enum LatencyMode {
  Low = 'low',
  Standard = 'standard'
}

export enum FinishAction {
  Page = 'page',
  Redirect = 'redirect'
}

export enum FormSubmitAction {
  ThankYou = 'thank_you',
  Redirect = 'redirect',
  Payment = 'payment'
}

export enum FormFieldType {
  Text = 'text',
  Email = 'email',
  Phone = 'phone',
  FirstName = 'firstName',
  LastName = 'lastName',
  FullName = 'fullName',
  Textarea = 'textarea',
  Select = 'select',
  Radio = 'radio',
  Checkbox = 'checkbox',
  Date = 'date',
  Number = 'number',
  Url = 'url'
}

export enum AutowebinarMode {
  Scheduled = 'scheduled'
}

export enum AutowebinarStatus {
  Draft = 'draft',
  Active = 'active',
  Archived = 'archived'
}

export enum ScenarioEventType {
  WaitingRoomStart = 'waiting_room_start',
  StreamStart = 'stream_start',
  Finish = 'finish',
  ShowForm = 'show_form',
  HideForm = 'hide_form',
  SaleBanner = 'sale_banner',
  ChatMessage = 'chat_message',
  Reaction = 'reaction'
}

export enum ScheduleStatus {
  Scheduled = 'scheduled',
  WaitingRoom = 'waiting_room',
  Live = 'live',
  Finished = 'finished'
}
