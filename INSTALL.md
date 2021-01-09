# GPIOServer: Easy end-user control of RasPi hardware

## Installing

This is an application-level program, not a system command or system feature. It is an add-on to your
product software, and as such there is no global "apt-get install". You will need a copy of the source
to modify for your needs.

### Step 1: Install AppDaemon

Install the "AppDaemon" project, per that project's instructions. Continue with the next step
once the AppDaemon example application is working.

[AppDaemon on GitHub](https://github.com/ToolChainGang/AppDaemon "AppDaemon on GitHub")

[AppDaemon on Hackaday.io](https://hackaday.io/project/175543-easy-raspi-configuration "App daemon on Hackaday.io")

### Step 2: Copy the GPIOServer project to /home/pi.


```
> cd
> git clone https://github.com/ToolChainGang/GPIOServer.git
```

### Step 3: Upgrade your system 

The project subdir "install" contains scripts to upgrade your system and install extra packages
which are not installed as part of the AppDaemon project.

For proper installation, each script should be run multiple times, fixing errors as needed until the
output contains nothing but a list of "already most recent version" messages.

```
(as root)

> cd /home/pi/GPIOServer/install
> ./05-UpgradeInstall.sh

Go get lunch, then rerun the script

> ./05-UpgradeInstall.sh

Verify that the output contains nothing but a list of "newest version" messages.

> ./06-UpgradePerl.sh

Go get dinner, then rerun the script

> ./06-UpgradePerl.sh

Verify that the output contains nothing but a list of "newest version" messages.
```

### Step 4: Configure your GPIO hardware

Edit the file "/home/pi/GPIOServer/etc/GPIO.conf" to describe your specific GPIO hardware.
The commentary at the top of that file explains the format, and there are
example configurations to help you get started.

The GPIOs shown by the GPIOServer should *NOT* include the ones used by the AppDaemon!

For example, suppose your rc.local contains the following:

```
nohup /root/AppDaemon/bin/AppDaemon -v --config-gpio=4 --led-gpio=19  \
                                       --web-dir /home/pi/GPIOServer/public_html
```

In this example, the GPIOServer will be unable to access GPIOs 4 and 19, since the AppDaemon
owns them.

### Step 5: Test your GPIO hardware

The install directory contains a testing app that uses the same GPIO numbering logic
as the GPIOServer. Execute that app with your GPIO settings and verify that inputs
can be read, outputs can be controlled, and so on.

For example, the following command will flash (blink on-and-off) GPIO19, and read
(and print) the values of GPIO4:

```
> GPIOTest --flash-gpio=19 --read-gpio=4
```

You can also use the "gpio" system command to test your hardware. Verify that
your input hardware works, your output hardware works, and so on. Some useful
gpio commands are:

```
gpio -h             # Show usage

gpio readall        # Read and display all GPIO modes and values

gpio read 12        # Read GPIO 12 and display the value

gpio blink 15       # Blink GPIO 15 on and off continuously, as an LED
```

### Step 6: Configure AppDaemon to run GPIOServer

Change the /etc/rc.local file so that the AppDaemon invokes the GPIOServer instead of the
sample application.

For example, put this at the end your /etc/rc.local file:

```
############################################################################################################
#
# Start the GPIOServer
#
set +e

ConfigGPIO=7;       # Config switch WPi07, Connector pin  7, BCM 04
LEDGPIO=24;         # Config LED    WPi24, Connector pin 35, BCM 19

Verbose="-v"        # AppDaemon gets very talky
#Verbose=           # AppDaemon shuts up

nohup /root/AppDaemon/bin/AppDaemon $Verbose --config-gpio=$ConfigGPIO --led-gpio=$LEDGPIO  \
                                             --web-dir /home/pi/GPIOServer/public_html      \
                                             --user=pi /home/pi/GPIOServer/bin/GPIOServer &

set -e
```

A sample rc.local file that does this is included with the project, so for a quick test you can do the following:

```
(as root) 

> cd /home/pi/GPIOServer/install
> cp /etc/rc.local /etc/rc.local.bak
> cp rc.local.SAMPLE /etc/rc.local
> reboot
```

### Step 5: Verify that everything is running

Open a browser and connect to the IP address of your raspberry pi, and verify the GPIOs are displayed correctly,
that they control your hardware in the correct manner, and so on.

For example, if your RasPi has IP address 192.168.1.31, enter "http://192.168.1.31/" into the address bar to
see the GPIOServer pages.

Use the command program "GPIOControl" to connect to the IP address of your raspberry pi and verify that it can control
the GPIOs in your system. For example, if your RasPi has IP address 192.168.1.31, from a different RasPi
enter something like the following:

```
> GPIOControl --host=192.168.1.31 ToggleGPIO 12
```

Assuming GPIO 12 is configured as an output to your system, the toggle command should switch the
output state: "Off" becomes "On", and "On" becomes "Off". 

If you have trouble, check out /home/pi/GPIOServer/install/DEBUGGING.txt for useful information.

Once everything is running the /home/pi/GPIOServer/install directory is no longer needed - you can delete it.
