#!/bin/bash
#
########################################################################################################################
########################################################################################################################
##
##      Copyright (C) ACS corporation, PO Box 7521, Milford, NH 03055
##      All Rights Reserved
##
##  FILE
##      04-UpgradePerl.sh
##
##  DESCRIPTION
##      Do all the CPAN installs needed for perl programs
##
##      Mostly a lot of CPAN library installs
##
##  USAGE
##      04-UpgradeInstall.sh
##
##      1) Run this file (as root)
##
########################################################################################################################
########################################################################################################################

#
# Ensure we're being run as root
#
if [[ $EUID -ne 0 ]]; then
    echo "Must be run as root" 
    echo
    exit 1
    fi

#
# Ensure the disk has been expanded
#
ROOTNUMS=(`df | grep root | tr "\t" "\n"`)
ROOTAVAIL=${ROOTNUMS[1]}

if [ "$ROOTAVAIL" -lt 4000000 ]; then
    echo "============>Disk is not expanded, automatically expanding with reboot..."
    echo "\n"
    raspi-config --expand-rootfs
    reboot
    fi

########################################################################################################################
########################################################################################################################
#
# Bluetooth stuff
#
echo "===================================="
echo "Installing Bluetooth"

apt-get -y update
apt-get -y install libbluetooth-dev

pip install PyBluez

apt-get -y install python-dev
apt-get -y install bluetooth
apt-get -y install bluez
apt-get -y install python-bluez
apt-get -y install pkg-config libboost-python-dev libboost-thread-dev libbluetooth-dev libglib2.0-dev python-dev

modprobe btusb
systemctl start bluetooth

echo "Done."
echo
