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
##              ->{HStart}                          Start of characteristics
##              ->{HEnd}                            End   of characteristics
##              ->{GATT}                            GATT info for UUID
##
##      GetBLEChars($IFace,$Dev,$HStart,$HEnd
##                          ($Timeout=10))  Return a hash of characteristics
##          ->{$Handle}                         Handle for this char   (ex: 0002)
##              ->{Handle}                          Handle             (same as hash key)
##              ->{VHandle}                         Handle for value
##              ->{Properties}                      R/W, etc
##              ->{UUID}                            Full UUID of characteristic
##
##      GetBLECharValue($IFace,$Dev,$VHnd
##                          ($Timeout=10))  Return value of specific BLE characteristic
##          ->{Value}                           String value of data
##          ->{BValue}[]                        Binary value of data (bytes)
##          ->{UValue}                          Binary value of data expressed as UTF8 (string)
##          ->{UValid}                          TRUE if UTF8 string is valid
##
##      GetBLECharPropInfo($Prop)           Convert char properties info to text format
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
use Site::GATTTable;

our @EXPORT  = qw(&GetBLEIFaces
                  &GetBLEDevs
                  &GetBLEServices
                  &GetBLEChars
                  &GetBLECharValue
                  &GetBLECharPropInfo
                  );          # Export by default

########################################################################################################################
########################################################################################################################
##
## Data declarations
##
########################################################################################################################
########################################################################################################################

our $DefaultTimeout = 10;                   # Default timeout, in seconds

our $PropBitChars   = "eainwcrB";           # Chars for bits in characteristic properties field

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
    {                                                                 Action => Site::ParseData::SaveLines    },
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

# our $IDMatches = [
#     {                   RegEx => qr/^LE\sScan/        , Action => Site::ParseData::SkipLine },
#     {                   RegEx => qr/($IDMatch)\s(.*)$/, Action => Site::ParseData::PushVar  },
#     ];

our $IDMatches = [
    {                   RegEx => qr/^LE\sScan/      , Action => Site::ParseData::SkipLine     },
    {                                                 Action => Site::ParseData::SaveLines    },
    {                   RegEx => qr/($IDMatch)\s.*$/, Action => Site::ParseData::StartSection },
    { Name => "ID"    , RegEx => qr/($IDMatch)\s.*$/, Action => Site::ParseData::AddVar       },
    { Name => "Names" , RegEx => qr/$IDMatch\s(.*)$/, Action => Site::ParseData::PushVar      },
    ];

#
# attr handle = 0x0001, end grp handle = 0x000b uuid: 00001800-0000-1000-8000-00805f9b34fb
# attr handle = 0x000c, end grp handle = 0x000f uuid: 00001801-0000-1000-8000-00805f9b34fb
# attr handle = 0x0010, end grp handle = 0x0022 uuid: 0000180a-0000-1000-8000-00805f9b34fb
# attr handle = 0x0023, end grp handle = 0x0030 uuid: 00001809-0000-1000-8000-00805f9b34fb
# attr handle = 0x0031, end grp handle = 0xffff uuid: 0000180f-0000-1000-8000-00805f9b34fb
#
our $ServiceMatches = [
    {                                                                Action => Site::ParseData::SaveLines    },
    {                    RegEx => qr/uuid:\s($UUIDMatch)$/         , Action => Site::ParseData::StartSection },
    { Name => "UUID"   , RegEx => qr/uuid:\s($UUIDMatch)$/         , Action => Site::ParseData::AddVar       },
    { Name => "HStart",  RegEx => qr/attr handle = 0x($H4Match)/   , Action => Site::ParseData::AddVar       },
    { Name => "HEnd"  ,  RegEx => qr/end grp handle = 0x($H4Match)/, Action => Site::ParseData::AddVar       },
    ];

#
# handle = 0x0002, char properties = 0x02, char value handle = 0x0003, uuid = 00002a00-0000-1000-8000-00805f9b34fb
# handle = 0x0004, char properties = 0x02, char value handle = 0x0005, uuid = 00002a01-0000-1000-8000-00805f9b34fb
# handle = 0x0006, char properties = 0x0a, char value handle = 0x0007, uuid = 00002a02-0000-1000-8000-00805f9b34fb
# handle = 0x0008, char properties = 0x08, char value handle = 0x0009, uuid = 00002a03-0000-1000-8000-00805f9b34fb
# handle = 0x000a, char properties = 0x02, char value handle = 0x000b, uuid = 00002a04-0000-1000-8000-00805f9b34fb
#
our $CharMatches = [
    {                                                                     Action => Site::ParseData::SaveLines    },
    {                       RegEx => qr/handle\s=\s0x($H4Match),/       , Action => Site::ParseData::StartSection },
    { Name => "Handle"    , RegEx => qr/handle\s=\s0x($H4Match),/       , Action => Site::ParseData::AddVar       },
    { Name => "Properties", RegEx => qr/properties\s=\s0x($H2Match),/   , Action => Site::ParseData::AddVar       },
    { Name => "VHandle"   , RegEx => qr/value\shandle\s=\s0x($H4Match),/, Action => Site::ParseData::AddVar       },
    { Name => "UUID"      , RegEx => qr/uuid\s=\s($UUIDMatch)$/         , Action => Site::ParseData::AddVar       },
    ];

#
# Characteristic value/descriptor: 4b 72 79 6f 2c 20 49 6e 63 2e
#
our $ValueMatches = [
    { Name => "Value" , RegEx => qr#Characteristic\svalue/descriptor: (.*)$#, Action => Site::ParseData::AddVar },
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

use Data::Dumper;
print Data::Dumper->Dump([$BLEDevs],["${IFace}->{Devs}"]);

    #
    # The BLE scan will return multiple names for any device, including one or more '(unknown)' entries.
    #   For this reason Names is an array of parsed values, and we select one of these names as the "Name".
    #
    foreach my $Dev (keys %{$BLEDevs}) {
        my $DevName = "";

        foreach my $Name (@{$BLEDevs->{$Dev}{Names}}) {
            $DevName = $Name
                if $DevName eq "" or $DevName eq "(unknown)";
            }

        $BLEDevs->{$Dev}{Name} = $DevName;
        }

    delete $BLEDevs->{_Lines};

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

use Data::Dumper;
print Data::Dumper->Dump([$BLEServices],["${IFace}->{$Dev}->{Services}"]);

    #
    # Add the GATT info for all services seen
    #
    $BLEServices->{$_}->{GATTInfo} = GetGATTDesc($BLEServices->{$_}{UUID})
        foreach keys %{$BLEServices};

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

    #
    # Add the GATT info for all services seen
    #
    foreach my $Char (keys %{$BLEChars}) {
        $BLEChars->{$Char}->{GATTInfo} = GetGATTDesc       ($BLEChars->{$Char}{UUID});
        $BLEChars->{$Char}->{PropInfo} = GetBLECharPropInfo($BLEChars->{$Char}{Properties});
        }

use Data::Dumper;
print Data::Dumper->Dump([$BLEChars],["${Dev}->Chars[$HStart .. $HEnd]->{}"]);

    return $BLEChars;
    }


########################################################################################################################
########################################################################################################################
#
# GetBLECharValue - Return value of specific BLE characteristic
#
# Inputs:   Interface to use
#           Device to scan
#           Characteristic handle
#           Timeout for scan (DEFAULT: 10 secs)
#
# Outputs:  Hash with Value of characteristic
#
sub GetBLECharValue {
    my $IFace   = shift;
    my $Dev     = shift;
    my $Char    = shift;
    my $Timeout = shift // $DefaultTimeout;

    my $ValueParse = Site::ParseData->new(Matches => $ValueMatches);
    my $ValueHash  = $ValueParse->ParseCommand("timeout -s SIGINT ${Timeout}s gatttool --adapter $IFace --device $Dev --char-read -a 0x$Char");

use Data::Dumper;
print Data::Dumper->Dump([$ValueHash],["ValueHash"]);

    $ValueHash->{ Value} =~ s/^\s+|\s+$//g;                                      # Trim spaces from both ends
    $ValueHash->{BValue} = [ map { hex($_) } (split / /,$ValueHash->{ Value}) ]; # Binary octets array
    $ValueHash->{UValue} = join '', map chr, @{$ValueHash->{BValue}};            # UTF8 conversion
    $ValueHash->{UValid} = utf8::decode($ValueHash->{UValue});
    $ValueHash->{TValue} = ToIEEE11073([reverse @{$ValueHash->{BValue}}]);       # Temperature data

print Data::Dumper->Dump([$ValueHash],["ValueHash"]);

    return $ValueHash;
    }


########################################################################################################################
########################################################################################################################
#
# GetBLECharPropInfo - Return a text version of the char properties byte
#
# Inputs:   Byte to convert
#
# Outputs:  Stringified version of properties
#
sub GetBLECharPropInfo {
    my $Prop = hex shift;
    my $Info = "";

    for( my $Bit = 0; $Bit < 8; $Bit++ ) {
        if( $Prop & (1 << $Bit) ) { $Info = substr($PropBitChars,7-$Bit,1) . $Info; }
        else                      { $Info = "." . $Info; }
        }

    return $Info;
    }



#
# Perl requires that a package file return a TRUE as a final value.
#
1;
