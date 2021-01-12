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
##      GetBLEIFaces()                      Return hash of BLE capable devices
##          ->{$IF}                             Hash of interface names (ex: "hci0")
##              ->{  IFace}                         Name of interface   (same as hash key)
##              ->{Address}                         Address of interface
##              ->{Running}                         TRUE if up and running
##
##      GetBLEDevs($IFace,($Timeout=10))    Return a hash of BLE devices in the system
##          ->{$ID}                             BLE device ID           (ex: "84:2E:14:87:66:97")
##              ->{ID}                              Device ID           (same as hash key)
##              ->{Name}                            Name of device      (ex: "Jovan Heart Monitor")
##              ->{Names}[]                         Array of names returned in scan
##
##      GetBLEServices($IFace,$Dev,
##                          ($Timeout=10))  Return a hash of BLE services for device
##          ->{$UUID}                           UUID of service         (ex: "00001801-0000-1000-8000-00805f9b34fb")
##              ->{UUID}                            Service ID          (same as hash key)
##              ->{Service}                         First 8 hex digits of UUID
##              ->{HDStart}                         Start of characteristics
##              ->{HDEnd}                           End   of characteristics
##
##      GetBLEChars($IFace,$Dev,$HStart,$HEnd
##                          ($Timeout=10))  Return a hash of characteristics
##          ->{$Handle}                         Handle for this char   (ex: 0002)
##              ->{Handle}                          Handle             (same as hash key)
##              ->{VHandle}                         Handle for value
##              ->{Properties}                      R/W, etc
##              ->{UUID}                            Full UUID of characteristic
##              ->{Service}                         First 8 digits of UUID
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

our @EXPORT  = qw(&GetBLEIFaces
                  &GetBLEDevs
                  &GetBLEServices
                  &GetBLEChars
                  );          # Export by default

########################################################################################################################
########################################################################################################################
##
## Data declarations
##
########################################################################################################################
########################################################################################################################

our $DefaultTimeout   = 10;                 # Default timeout, in seconds

our $H2Match = "[[:xdigit:]]{2}";           # Match exactly 2  hex digits
our $H4Match = "[[:xdigit:]]{4}";           # Match exactly 4  hex digits
our $H8Match = "[[:xdigit:]]{8}";           # Match exactly 4  hex digits
our $HCMatch = "[[:xdigit:]]{12}";          # Match exactly 12 hex digits

#
# Example ID: 84:2E:14:87:66:87
#
our $IDMatch   = "$H2Match:$H2Match:$H2Match:$H2Match:$H2Match:$H2Match";

#
# Example UUID: 00001800-0000-1000-8000-00805f9b34fb
#
our $UUIDMatch = "$H8Match-$H4Match-$H4Match-$H4Match-$HCMatch";

#
# hci0:	Type: Primary  Bus: UART
# 	BD Address: DC:A6:32:33:CD:93  ACL MTU: 1021:8  SCO MTU: 64:1
# 	UP RUNNING 
# 	RX bytes:6530 acl:10 sco:0 events:304 errors:0
# 	TX bytes:3511 acl:10 sco:0 commands:163 errors:0
#
our $IFaceMatches = [
    {                    RegEx => qr/^(\w+\d+):\s*Type\s*/          , Action => Site::ParseData::StartSection },
    { Name => "IFace"  , RegEx => qr/^(\w+\d+):\s*Type\s*/          , Action => Site::ParseData::AddVar       },
    { Name => "Address", RegEx => qr/\s*Address:\s*($IDMatch)\s*ACL/, Action => Site::ParseData::AddVar       },
    { Name => "Running", RegEx => qr/\s*UP\s*(RUNNING)/             , Action => Site::ParseData::AddVar       },
    {                    RegEx => qr/\s*TX\s*bytes/                 , Action => Site::ParseData::EndSection   },
    ];

#
# LE Scan ...
# 84:2E:14:87:66:87 OOLER-9200413424
# 84:2E:14:87:66:87 (unknown)
# 58:2D:34:37:8D:DD (unknown)
# 58:2D:34:37:8D:DD MJ_HT_V1
# D4:9D:C0:88:21:89 (unknown)
#
our $IDMatches = [
    {                   RegEx => qr/^LE\sScan/        , Action => Site::ParseData::SkipLine },
    {                   RegEx => qr/($IDMatch)\s(.*)$/, Action => Site::ParseData::PushVar  },
    ];


#
# attr handle = 0x0001, end grp handle = 0x000b uuid: 00001800-0000-1000-8000-00805f9b34fb
# attr handle = 0x000c, end grp handle = 0x000f uuid: 00001801-0000-1000-8000-00805f9b34fb
# attr handle = 0x0010, end grp handle = 0x0022 uuid: 0000180a-0000-1000-8000-00805f9b34fb
# attr handle = 0x0023, end grp handle = 0x0030 uuid: 00001809-0000-1000-8000-00805f9b34fb
# attr handle = 0x0031, end grp handle = 0xffff uuid: 0000180f-0000-1000-8000-00805f9b34fb
#
our $ServiceMatches = [
    {                    RegEx => qr/uuid:\s($UUIDMatch)$/         , Action => Site::ParseData::StartSection },
    { Name => "UUID"   , RegEx => qr/uuid:\s($UUIDMatch)$/         , Action => Site::ParseData::AddVar       },
    { Name => "HDStart", RegEx => qr/attr handle = 0x($H4Match)/   , Action => Site::ParseData::AddVar       },
    { Name => "HDEnd"  , RegEx => qr/end grp handle = 0x($H4Match)/, Action => Site::ParseData::AddVar       },
    { Name => "Service", RegEx => qr/uuid:\s($H8Match)/            , Action => Site::ParseData::AddVar       },
    ];

#
# handle = 0x0002, char properties = 0x02, char value handle = 0x0003, uuid = 00002a00-0000-1000-8000-00805f9b34fb
# handle = 0x0004, char properties = 0x02, char value handle = 0x0005, uuid = 00002a01-0000-1000-8000-00805f9b34fb
# handle = 0x0006, char properties = 0x0a, char value handle = 0x0007, uuid = 00002a02-0000-1000-8000-00805f9b34fb
# handle = 0x0008, char properties = 0x08, char value handle = 0x0009, uuid = 00002a03-0000-1000-8000-00805f9b34fb
# handle = 0x000a, char properties = 0x02, char value handle = 0x000b, uuid = 00002a04-0000-1000-8000-00805f9b34fb
#
our $CharMatches = [
    {                       RegEx => qr/handle\s=\s0x($H4Match),/       , Action => Site::ParseData::StartSection },
    { Name => "Handle"    , RegEx => qr/handle\s=\s0x($H4Match),/       , Action => Site::ParseData::AddVar       },
    { Name => "Properties", RegEx => qr/properties\s=\s0x($H2Match),/   , Action => Site::ParseData::AddVar       },
    { Name => "VHandle"   , RegEx => qr/value\shandle\s=\s0x($H4Match),/, Action => Site::ParseData::AddVar       },
    { Name => "UUID"      , RegEx => qr/uuid\s=\s($UUIDMatch)$/         , Action => Site::ParseData::AddVar       },
    { Name => "Service"   , RegEx => qr/uuid\s=\s($H8Match)-/           , Action => Site::ParseData::AddVar       },
    ];



########################################################################################################################
########################################################################################################################
#
# GetBLEIFaces - Return list of BLE capable interfaces
#
# Inputs:   None.
#
# Outputs:  Hash of BLE capable interfaces, by name
#
sub GetBLEIFaces {

    my $IFaceParse = Site::ParseData->new(Matches => $IFaceMatches);
    my $BLEIFaces  = $IFaceParse->ParseCommand("hciconfig");

# use Data::Dumper;
# print Data::Dumper->Dump([$BLEIFaces],[qw(BLEIFaces)]);

    return $BLEIFaces;
    }


########################################################################################################################
########################################################################################################################
#
# GetBLEDevs - Return list of network devices
#
# Inputs:   Interface to scan
#           Timeout for scan (DEFAULT: 10 secs)
#
# Outputs:  [Ref to] Hash of BLE devices, by ID
#
sub GetBLEDevs {
    my $IFace   = shift;
    my $Timeout = shift // $DefaultTimeout;

    my $DevParse = Site::ParseData->new(Matches => $IDMatches);
    my $BLEDevs  = $DevParse->ParseCommand("sudo timeout -s SIGINT ${Timeout}s hcitool -i $IFace lescan");

    #
    # The BLE scan will return multiple names for any device, including one or more '(unknown)' entries.
    #   Select an appropriate name.
    #
    foreach my $Dev (keys %{$BLEDevs}) {
        my $DevName = "";

        foreach my $Name (@{$BLEDevs->{$Dev}}) {
            $DevName = $Name
                if $DevName eq "" or $DevName eq "(unknown)";
            }

        $BLEDevs->{$Dev} = { ID => $Dev, Name => $DevName, Names => [ @{$BLEDevs->{$Dev}} ] };
        }

# use Data::Dumper;
# print Data::Dumper->Dump([$BLEDevs],["${IFace}->{Devs}"]);

    return $BLEDevs;
    }


########################################################################################################################
########################################################################################################################
#
# GetBLEServices - Return list of primary services for BLE device
#
# Inputs:   Interface to use
#           Device to scan
#           Timeout for scan (DEFAULT: 10 secs)
#
# Outputs:  [Ref to] Hash of primary services
#
sub GetBLEServices {
    my $IFace   = shift;
    my $Dev     = shift;
    my $Timeout = shift // $DefaultTimeout;

    my $ServiceParse = Site::ParseData->new(Matches => $ServiceMatches);
    my $BLEServices  = $ServiceParse->ParseCommand("timeout -s SIGINT ${Timeout}s gatttool --adapter $IFace --device $Dev --primary");

# use Data::Dumper;
# print Data::Dumper->Dump([$BLEServices],["${IFace}->{$Dev}->{Services}"]);

    return $BLEServices;
    }


########################################################################################################################
########################################################################################################################
#
# GetBLEChars - Return list of characteristics for BLE device service
#
# Inputs:   Interface to use
#           Device to scan
#           Service handle start
#           Service handle end
#           Timeout for scan (DEFAULT: 10 secs)
#
# Outputs:  [Ref to] Hash of primary services
#
sub GetBLEChars {
    my $IFace   = shift;
    my $Dev     = shift;
    my $HStart  = shift;
    my $HEnd    = shift;
    my $Timeout = shift // $DefaultTimeout;

    my $CharParse = Site::ParseData->new(Matches => $CharMatches);
    my $BLEChars  = $CharParse->ParseCommand("timeout -s SIGINT ${Timeout}s gatttool --adapter $IFace --device $Dev --characteristics -s $HStart -e $HEnd");

# use Data::Dumper;
# print Data::Dumper->Dump([$BLEChars],["${Dev}->Chars[$HStart .. $HEnd]->{}"]);

    return $BLEChars;
    }



#
# Perl requires that a package file return a TRUE as a final value.
#
1;
