# BLEServer: Easy end-user control of BLE devices from Raspberry Pi

## Installing

### Step 1: Install AppDaemon

Install the "AppDaemon" project, per that project's instructions. Continue with the next step
once the AppDaemon example application is working.

[AppDaemon on GitHub](https://github.com/ToolChainGang/AppDaemon "AppDaemon on GitHub")

[AppDaemon on Hackaday.io](https://hackaday.io/project/175543-easy-raspi-configuration "App daemon on Hackaday.io")

### Step 2: Copy the BLEServer project to /home/pi.


```
> cd
> git clone https://github.com/ToolChainGang/BLEServer.git
```

### Step 3: Upgrade your system 

The project subdir "install" contains scripts to upgrade your system and install extra packages
which are not installed as part of the AppDaemon project.

For proper installation, each script should be run multiple times, fixing errors as needed until the
output contains nothing but a list of "already most recent version" messages.

```
(as root)

> cd /home/pi/BLEServer/install
> ./05-UpgradeInstall.sh

Go get lunch, then rerun the script

> ./05-UpgradeInstall.sh

Verify that the output contains nothing but a list of "newest version" messages.

> ./06-UpgradePerl.sh

Go get dinner, then rerun the script

> ./06-UpgradePerl.sh

Verify that the output contains nothing but a list of "newest version" messages.
```

### Step 6: Configure AppDaemon to run BLEServer

Change the /etc/rc.local file so that the AppDaemon invokes the BLEServer instead of the
sample application.

For example, put this at the end your /etc/rc.local file:

```
########################################################################################################################
#
# Start the BLEServer
#
set +e

ConfigGPIO=4;       # Config switch WPi07, Connector pin  7, GPIO (command) BCM 04
LEDGPIO=19;         # Config LED    WPi24, Connector pin 35, GPIO (command) BCM 19

Verbose="-v"        # AppDaemon gets very talky
#Verbose=           # AppDaemon shuts up

nohup /root/AppDaemon/bin/AppDaemon $Verbose --config-gpio=$ConfigGPIO --led-gpio=$LEDGPIO  \
                                             --web-dir /home/pi/BLEServer/public_html       \
                                             --user=pi /home/pi/BLEServer/bin/BLEServer &

set -e
```

A sample rc.local file that does this is included with the project, so for a quick test you can do the following:

```
(as root) 

> cd /home/pi/BLEServer/install
> cp /etc/rc.local /etc/rc.local.bak
> cp rc.local.SAMPLE /etc/rc.local
> reboot
```

### Step 5: Verify that everything is running

Open a browser and connect to the IP address of your raspberry pi, and verify the BLE adapters are displayed correctly,
that they control your hardware in the correct manner, and so on.

For example, if your RasPi has IP address 192.168.1.31, enter "http://192.168.1.31/" into the address bar to
see the BLEServer pages.

Use the command program "BLECommand" to connect to the IP address of your raspberry pi and verify that it can control
the BLE devices in your system. For example, if your RasPi has IP address 192.168.1.31, from a different RasPi
enter something like the following:

```
> BLEControl --host=192.168.1.31
```

Assuming GPIO 12 is configured as an output to your system, the toggle command should switch the
output state: "Off" becomes "On", and "On" becomes "Off". 

If you have trouble, check out /home/pi/BLEServer/install/DEBUGGING.txt for useful information.

Once everything is running the /home/pi/BLEServer/install directory is no longer needed - you can delete it.
