export type PhysicsConfig = {
  cell: number;
  playerHalf: number;
  fixedStep: number;
  gravity: number;
  maxFallSpeed: number;
  maxRunSpeed: number;
  groundAcceleration: number;
  airAcceleration: number;
  groundFriction: number;
  jumpVelocity: number;
  coyoteTime: number;
  jumpBuffer: number;
  hookRange: number;
  minRopeLength: number;
  reelSpeed: number;
  swingPumpAcceleration: number;
  hookAimCone: number;
  hookAimWeight: number;
  hookDistanceWeight: number;
  bubbleHorizontalImpulse: number;
  bubbleVerticalImpulse: number;
  bubbleCooldown: number;
  cameraLag: number;
};

export const PHYSICS: PhysicsConfig = {
  cell: 18,
  playerHalf: 6,
  fixedStep: 1 / 120,
  gravity: 1120,
  maxFallSpeed: 780,
  maxRunSpeed: 250,
  groundAcceleration: 1650,
  airAcceleration: 860,
  groundFriction: 1900,
  jumpVelocity: 430,
  coyoteTime: 0.11,
  jumpBuffer: 0.11,
  hookRange: 440,
  minRopeLength: 44,
  reelSpeed: 135,
  swingPumpAcceleration: 190,
  hookAimCone: 0.15,
  hookAimWeight: 0.84,
  hookDistanceWeight: 0.16,
  bubbleHorizontalImpulse: 215,
  bubbleVerticalImpulse: 350,
  bubbleCooldown: 0.42,
  cameraLag: 8.5,
};
