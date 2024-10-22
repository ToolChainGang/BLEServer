#!/bin/bash
#
########################################################################################################################
########################################################################################################################
##
##      Copyright (C) 2020 Peter Walsh, Milford, NH 03055
##      All Rights Reserved under the MIT license as outlined below.
##
##  FILE
##      05-UpgradeInstall.sh
##
##  DESCRIPTION
##      Do all the system (ie: non-perl) upgrades and installs needed for the AppDaemon
##
##  USAGE
##      05-UpgradeInstall.sh
##
##  NOTES
##      Wifi access can be intermittant, causing some installs to fail. This will leave the system
##        in a *valid* state, with some packages downloaded but not installed.
##
##      The recommended procedure is to run this script over and over until the output consists  
##        exclusively of "already the newest version" messages and the like.
##
########################################################################################################################
########################################################################################################################
##
##  MIT LICENSE
##
##  Permission is hereby granted, free of charge, to any person obtaining a copy of
##    this software and associated documentation files (the "Software"), to deal in
##    the Software without restriction, including without limitation the rights to
##    use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies
##    of the Software, and to permit persons to whom the Software is furnished to do
##    so, subject to the following conditions:
##
##  The above copyright notice and this permission notice shall be included in
##    all copies or substantial portions of the Software.
##
##  THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED,
##    INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A
##    PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT
##    HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
##    OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
##    SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
##
########################################################################################################################
########################################################################################################################

PATH="$PATH:../bin"

########################################################################################################################
########################################################################################################################
#
# Ensure we're being run as root
#
if ! IAmRoot; then
    echo
    echo "Must be run as root" 
    echo
    exit 1
    fi

########################################################################################################################
########################################################################################################################
#
# Ensure that the disk has been expanded
#
if ! DiskExpanded; then
    echo "============>Disk is not expanded, automatically expanding with reboot..."
    echo
    raspi-config --expand-rootfs
    reboot
    exit
    fi

########################################################################################################################
########################################################################################################################
#
# Upgrade linux installation
#
echo "========================="
echo "Upgrading linux"

apt-get update
apt-get -y upgrade

echo "Done."
echo

########################################################################################################################
########################################################################################################################
#
# Packages
#
echo "===================================="
echo "Installing packages"

apt-get -y install emacs
apt-get -y install libtinfo-dev
apt-get -y install libncurses5-dev
apt-get -y install libreadline-dev
apt-get -y install libterm-readline-gnu-perl
apt-get -y autoremove

echo "Done."
echo

########################################################################################################################
#
# All done - Tell the user to reboot
#
echo "========================="
echo
echo "Done with installation, reboot for changes to take effect."
echo
