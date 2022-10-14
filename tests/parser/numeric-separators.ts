11_11_11;
0b01_01_01;
0o12_12_12;
0x23_23_23;
1_000_000.1234_1234;
1_0e1_0;
1_000_000e-1_0;
0.0_0;
1_0e0_0;
1_0e0_1;

// error cases that should still continue parsing:

11_11_11_; // 6188
11__11_11; // 6189

0b01_01_01_; // 6188
0b01__01_01; // 6189

0o12_12_12_; // 6188
0o12__12_12; // 6189

0x23_23_23_; // 6188
0x23__23_23; // 6189

1000_.1234; // 6188
1000._1234; // 6188
1000.1234_; // 6188

10__00.1234; // 6189
1000.12__34; // 6189

1_e2; // 6188
1e_2; // 6188
1e2_; // 6188
1e-1__0; // 6189

0_0; // 6188
0_0.0; // 6188
0_0.0_0; // 6188
0_0e0_0; // 6188

0x_11_11; // 6188
0o_11_11; // 6188
0b_11_11; // 6188

00_01 // 1121
