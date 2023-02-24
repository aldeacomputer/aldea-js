import moment from "moment";

export interface Clock {
  now (): moment.Moment
}

export class MomentClock {
  now (): moment.Moment {
    return moment()
  }
}

export class StubClock {
  private date: moment.Moment
  constructor(aDate: moment.Moment) {
    this.date = aDate
  }

  now (): moment.Moment {
    return this.date
  }

  changeDate (aDate: moment.Moment): void {
    this.date = aDate
  }
}
