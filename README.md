# BLEExplorer
A GUI tool to explore nearby BLE devices

This project is NOT COMPLETE.

Much works, but it doesn't handle BLE errors gracefully (such as disconnect of weak signals), and there is no provision for writing characteristics or characteristic access flags.

(For example, it allows the user to write a read-only characteristic, which causes an error. It doesn't crash, but you will need to reload the page.)

aa