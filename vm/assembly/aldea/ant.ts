export class Ant extends Jig {
  children: Ant[]
  friends: Ant[]

  constructor() {
    super()
    this.children = []
    this.friends = []
  }

  addChildren (ant: Ant): void {
    ant.$lock.changeToCallerLock()
    this.children.push(ant)
  }

  addFriend (ant: Ant): void {
    this.friends.push(ant)
  }

  buildCapacity (): u32 {
    return 1 + this.friends.length +
      this.children.map((child: Ant) => child.familyPower()) // calls a private method
        .reduce((total, current) => total + current, 0)
  }

  private familyPower (): u32 {
    return this.children
      .map((child: Ant) => child.buildCapacity())
      .reduce((total, current) => total + current, 0)
  }

  /*
  this will fail bacause its calling public method on not owned jig
   */
  forceAFriendToWork (): u32 {
    return this.friends[0].buildCapacity()
  }

  /*
   this method will fail bac
  */
  forceFriendsFamilyToWork (): u32 {
    return this.friends
      .map((friend: Ant) => friend.familyPower()) // here it fails
      .reduce((total, current) => total + current, 0)
  }
}
