#!/dev/null
########################################################################################################################
########################################################################################################################
##
##      Copyright (C) 2020 Peter Walsh, Milford, NH 03055
##      All Rights Reserved under the MIT license as outlined below.
##
##  FILE
##
##      Site::BLEInfo.pm
##
##  DESCRIPTION
##
##      Return various BLE device info structs
##
##  DATA
##
##      None.
##
##  FUNCTIONS
##
##      GetBLEDevs()        Return a hash of BLE devices in the system
##          ->{$ID}             BLE device ID           (ex: "84:2E:14:87:66:97")
##              ->{ID}          ID of BLE device        (same has hash key)
##              ->{Info}        Info returned from scan (ie - name of device)
##
##      GetWPAInfo()        Return array of WPA info
##          ->{Valid}           TRUE if WPA info file found
##          ->{SSID}            SSID of WiFi to connect
##          ->{KeyMgmt}         Key mgmt type         (ie: "WPA-PSK")
##          ->{Password}        Password to use with connection
##          ->{ Country}        Country code for Wifi (ie: "us")
##
##      SetWPAInfo($Info)   Write new WPA info with new values
##
##      GetDHCPInfo()       Return array of interface specifics from DHCPCD.conf
##          ->{Valid}           TRUE if DHCP info file found
##          ->{$IF}             Name of interface
##              ->{IPAddr}      Static IP address of interface
##              ->{Router}      Static router     of interface
##              ->{DNS1}        Static 1st DNS to use
##              ->{DNS2}        Static 2nd DNS to use
##    
##      SetDHCPInfo($Info)  Write new DHCP info with new values
##
##      GetNetEnable()->[]  Return array if enable/disable specifics from the netenable file
##          ->{Valid}           TRUE if netenable info file found
##          ->{$IF}             Points to interfaces entry for interface
##              ->"enable"      Value is "enable" or "disable"
##
##      SetNetEnable($Info) Write new netenable info with new values
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

package Site::BLEInfo;
    use base "Exporter";

use strict;
use warnings;
use Carp;

use File::Slurp qw(read_file write_file);

use Site::ParseData;

our @EXPORT  = qw(&GetBLEDevs
                  );          # Export by default

########################################################################################################################
########################################################################################################################
##
## Data declarations
##
########################################################################################################################
########################################################################################################################

our $DefaultInterface = "hci0";             # Default to use if not specified


#
# LE Scan ...
# 84:2E:14:87:66:97 OOLER-9200403420
# 84:2E:14:87:66:97 (unknown)
# 58:2D:34:37:8D:DD (unknown)
# 58:2D:34:37:8D:DD MJ_HT_V1
# D4:9D:C0:88:21:89 (unknown)
#
our $IDMatches = [
    {                   RegEx => qr/^LE\sScan/                        , Action => Site::ParseData::SkipLine     },
    {                   RegEx => qr/(\d*\:\d*\:\d*\:\d*:\d*:\d*)/     , Action => Site::ParseData::StartSection },
    { Name   => "ID",   RegEx => qr/(\d*\:\d*\:\d*\:\d*:\d*:\d*)/     , Action => Site::ParseData::AddVar       },
    { Name   => "Info", RegEx => qr/\d*\:\d*\:\d*\:\d*:\d*:\d*\s(.*)$/, Action => Site::ParseData::AddVar       },
    ];

########################################################################################################################
########################################################################################################################
#
# GetBLEDevs - Return list of network devices
#
# Inputs:   Interface to use (DEFAULT: "hci0")
#
# Outputs:  [Ref to] Array of BLE devices, by ID
#
sub GetBLEDevs {
    my $Interface = shift // $DefaultInterface;

    my $DevParse = Site::ParseData->new(Matches => $IDMatches);

    #
    # I don't *think* there's a way that this can be invalid, so didn't bother checking results.
    #
    my $BLEDevs = $DevParse->ParseCommand("hcitool -i $Interface lescan");

use Data::Dumper;
print Data::Dumper->Dump([$BLEDevs],[qw(BLEDevs)]);

    return $BLEDevs;
    }



#
# Perl requires that a package file return a TRUE as a final value.
#
1;
