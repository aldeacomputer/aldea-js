export class Ant extends Jig {
  children: Ant[]
  friends: Ant[]

  constructor() {
    super()
    this.children = []
    this.friends = []
  }

  addChild (ant: Ant): void {
    ant.$lock.changeToJigLock()
    this.children.push(ant)
  }

  addFriend (ant: Ant): void {
    this.friends.push(ant)
  }

  private childrenCapacity (): u32 {
    return this.children
      .map<u32>((child: Ant) => child.familyPower())
      .reduce((total, current) => total + current, 0)
  }

  workCapacity (): u32 {
    return 1 +
      this.friends.length +
      this.childrenCapacity()
  }

  familyPower (): u32 {
    return this.children
      .map<u32>((child: Ant) => child.workCapacity())
      .reduce((total, current) => total + current, 0)
  }

  getFamily (): Ant[] {
    return this.children
  }

  /*
  this will fail bacause its calling public method on not owned jig
   */
  forceAFriendToWork (): u32 {
    return this.friends[0].workCapacity()
  }

  /*
   this method will fail bac
  */
  forceFriendsFamilyToWork (): u32 {
    return this.friends
      .map<u32>((friend: Ant) => friend.familyPower()) // here it fails
      .reduce((total, current) => total + current, 0)
  }
}
