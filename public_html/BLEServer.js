////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//
// BLEServer.js - Javascript for BLEServer pages
//
// Copyright (C) 2020 Peter Walsh, Milford, NH 03055
// All Rights Reserved under the MIT license as outlined below.
//
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//
//  MIT LICENSE
//
//  Permission is hereby granted, free of charge, to any person obtaining a copy of
//    this software and associated documentation files (the "Software"), to deal in
//    the Software without restriction, including without limitation the rights to
//    use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies
//    of the Software, and to permit persons to whom the Software is furnished to do
//    so, subject to the following conditions:
//
//  The above copyright notice and this permission notice shall be included in
//    all copies or substantial portions of the Software.
//
//  THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED,
//    INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A
//    PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT
//    HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
//    OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
//    SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
//
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//
// BLEInfo                                             # Data supplied by this server
//     ->{Timeout}                                     # Timeout in seconds for commands (DEFAULT: 10)
//     ->{Hostname}                                    # System name (from /etc/hostname)
//     ->{IFaces}                                      # Available BLE interfaces
//         ->{$IF}                                     # Interface to scan     (ex: "hci0")
//             ->{IFace  }                             # Name of interface     (same as hash key)
//             ->{Address}                             # Address of interface
//             ->{Running}                             # TRUE if up and running
//             ->{State}                               # "Open", "Closed", "Scanning"
//             ->{HTMLID}                              # HTML object ID        ("I" + hash key)
//             ->{Open}                                # TRUE if the checkbox exists and is open
//             ->{Devs}                                # Scanned devices
//                 ->{$Dev}                            # BLE device ID                 (ex: "84:2E:14:87:66:97")
//                     ->{ID}                          # Device ID                     (same as hash key)
//                     ->{Name}                        # Name of device                (ex: "Jovan Heart Monitor")
//                     ->{Names}[]                     # Array of names returned in scan
//                     ->{State}                       # "Open", "Closed", "Scanning"
//                     ->{HTMLID}                      # HTML object ID                ("D" + Hash key)
//                     ->{Open}                        # TRUE if the checkbox exists and is open
//                     ->{Services}                    # Services available
//                         ->{$UUID}                   # UUID of service               (ex: "00001801-0000-1000-8000-00805f9b34fb")
//                             ->{UUID}                # Service UUID                  (same as hash key)
//                             ->{Service}             # First 8 hex digits of UUID    (ex: "00001801")
//                             ->{HDStart}             # Start of characteristics
//                             ->{HDEnd}               # End   of characteristics
//                             ->{State}               # "Open", "Closed", "Scanning"
//                             ->{HTMLID}              # HTML object ID                ("S" + Hash key)
//                             ->{Open}                # TRUE if the checkbox exists and is open
//                             ->{Chars}               # List of available characteristics
//                                 ->{$Char}           # Handle for this char          (ex: "0002")
//                                     ->{Handle}      # Handle                        (same as hash key)
//                                     ->{VHandle}     # Handle for value
//                                     ->{Properties}  # R/W, etc
//                                     ->{UUID}        # Full UUID of characteristic   (ex: "00001801-0000-1000-8000-00805f9b34fb")
//                                     ->{Service}     # First 8 digits of char UUID   (ex: "00001801")
//                                     ->{State}       # "Open", "Closed", "Scanning"
//                                     ->{HTMLID}      # HTML object ID                ("C" + Hash key)
//                                     ->{Open}        # TRUE if the checkbox exists and is open
//                                     ->{Values}      # List of seen values
//
// In what follows: $TYPE  Is the type of the directory (ex: "IF")
//                  $DIR   Is the name of the directory (ex: "hci0", which is of yupe IF
//
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////

    var ConfigSystem = location.hostname;
    var ConfigAddr   = "ws:" + ConfigSystem + ":2021";

    var ConfigSocket;
    var ConfigData;

    var WindowWidth;
    var WindowHeight;

    var BLEInfo;
    var PrevBLEInfo;
    var Populated = 0;      // TRUE if web page tables populated from GPIOInfo

    //
    // Directory list line
    //
    DirLine = '\
        <input type="checkbox" $OPEN id="$HTMLID" onclick="Toggle(this)" />   \
        <label class="tree_label" for="$HTMLID">$DIR</label>';

    //
    // "Scanning" mode line
    //
    var ScanningLine = '\
        <ul><li><span class="tree_label">Scanning...</span></li></ul>';

    //
    // "None" mode line
    //
    var NoneLine = '\
        <ul><li><span class="tree_label">None.</span></li></ul>';

    //
    // On first load, calculate reliable page dimensions and do page-specific initialization
    //
    window.onload = function() {
        //
        // (This crazy nonsense gets the width in all browsers)
        //
        WindowWidth  = window.innerWidth  || document.documentElement.clientWidth  || document.body.clientWidth;
        WindowHeight = window.innerHeight || document.documentElement.clientHeight || document.body.clientHeight;

        PageInit();     // Page specific initialization

        Populated = 0;
        ConfigConnect();
        }

    //
    // Send a command to the server
    //
    function ServerCommand(Command,Arg1,Arg2,Arg3,Arg4,Arg5) {
        ConfigSocket.send(JSON.stringify({
            "Type"  : Command,
            "Arg1"  : Arg1,
            "Arg2"  : Arg2,
            "Arg3"  : Arg3,
            "Arg4"  : Arg4,
            "Arg5"  : Arg5,
             }));
        }

    function ConfigConnect() {
        ConfigSocket = new WebSocket(ConfigAddr);
        ConfigSocket.onmessage = function(Event) {
            ConfigData = JSON.parse(Event.data);

//            console.log("Msg: "+Event.data);

            if( ConfigData["Error"] != "No error." ) {
                console.log("Error: "+ConfigData["Error"]);
                console.log("Msg:   "+Event.data);
                alert("Error: " + ConfigData["Error"]);
                return;
                }

            //
            // Most messages return a GPIOInfo struct, which updates the shown values
            //
            if( ConfigData["Type"] == "GetBLEInfo" ) {
//                console.log(BLEInfo);

                BLEInfo = ConfigData.State;
                SetStates(BLEInfo);

                HostnameElements = document.getElementsByClassName("Hostname");
                for (i = 0; i < HostnameElements.length; i++) {
                    HostnameElements[i].innerHTML = BLEInfo.Hostname;
                    };

                DisplayBLEInfo();
                GotoPage("MainPage");
                ServerCommand("ScanIFs");
                return;
                }

            if( ConfigData["Type"] == "ScanIFs"      ||
                ConfigData["Type"] == "ScanDevs"     ||
                ConfigData["Type"] == "ScanServices" ||
                ConfigData["Type"] == "ScanChars"    ) {
//                console.log("Msg: "+Event.data);

                BLEInfo = ConfigData.State;
                SetStates(BLEInfo);
                DisplayBLEInfo();
                return;
                }

            //
            // Unexpected messages
            //
            console.log(ConfigData);
            alert(ConfigData["Type"] + " received");
            };

        ConfigSocket.onopen = function(Event) {
            GotoPage("ConnectingPage");
            ServerCommand("GetBLEInfo");
            }
        };

    //
    // Cycle through the various pages
    //
    function GotoPage(PageName) {

        Pages = document.getElementsByClassName("PageDiv");

        for (i = 0; i < Pages.length; i++) {
            Pages[i].style.display = "none";
            };

        if( PageName == "MainPage"   ) { PopulateMainPage  (); }
        if( PageName == "ConfigPage" ) { PopulateConfigPage(); }

        document.getElementById(PageName).style.display = "block";

        };

    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    //
    // PopulateMainPage - Populate the landing page as needed
    //
    function PopulateMainPage() { DisplayBLEInfo(); }

    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    //
    // PopulateGPIOConfigPage - Populate the configuration page as needed
    //
    function PopulateConfigPage() {}

    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    //
    // Open - Open up a directory
    //
    function PopulateConfigPage() {}

    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    //
    // SetStates - Set all BLEInfo State vars
    //
    // Inputs:  BLEInfo to set
    //
    // Outputs: None.
    //
    // The following vars are set for each dir object in BLEInfo:
    //
    //              HTMLID  HTML object id, valid for HTML "ID" field
    //              Open    Whether the checkbox should be open or closed
    //
    function SetStates(BLEInfo) {

        if( !BLEInfo.IFaces )
            return;

        Object.keys(BLEInfo.IFaces).forEach(function (IF) { 

            var Dir = BLEInfo.IFaces[IF];
            if( SetState(Dir,IF,"I",Dir.Devs) )
                return;

            Object.keys(BLEInfo.IFaces[IF].Devs).forEach(function (Dev) { 

                var Dir = BLEInfo.IFaces[IF].Devs[Dev];
                if( SetState(Dir,Dev,"D",Dir.Services) )
                    return;

                Object.keys(BLEInfo.IFaces[IF].Devs[Dev].Services).forEach(function (Serv) { 

                    var Dir = BLEInfo.IFaces[IF].Devs[Dev].Services[Serv];
                    if( SetState(Dir,Serv,"S",Dir.Chars) )
                        return;

                    Object.keys(BLEInfo.IFaces[IF].Devs[Dev].Services[Serv].Chars).forEach(function (Char) { 

                        var Dir = BLEInfo.IFaces[IF].Devs[Dev].Services[Serv].Chars[Char];
                        if( SetState(Dir,Char,"C",Dir.Values) )
                            return;

                        });
                    });
                });
            });
        }

    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    //
    // SetState - Set Dir state to known value
    //
    // Inputs:  Directory to set   (an IF, Dev, Service, or Char)
    //          Name of Dir        (ex: "hci0")
    //          Prefix char for ID (  "I", "D", "S",     or "C" )
    //          Next-level subdir to directory
    //
    // Outputs: 0 if subdir contains entries to be processed
    //          1 if subdir is undefined and recursive processing should be skipped.
    //
    function SetState(Dir,Name,Prefix,Arr) {

        Dir.HTMLID = Prefix + Name;
        Dir.Open   = false;

        var Checkbox = document.getElementById(Dir.HTMLID);

        if( Checkbox ) {
            Dir.Open = Checkbox.checked;
            }

        if( !Arr )
            return 1;

        return Object.keys(Arr).length == 0;
        }

    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    //
    // Toggle - Toggle one individual dir Open <-> Closed
    //
    // Inputs:  Object that was toggled
    //
    // Outputs: None. Open is changed in place.
    //
    function Toggle(self) {
        var HTMLID  = self.id;
        var Toggled = false;

        Object.keys(BLEInfo.IFaces).forEach(function (IF) { 

            if( Toggled ) return;
            var Dir = BLEInfo.IFaces[IF];

            if( Dir.HTMLID === HTMLID ) {
                Dir.Open = !Dir.Open;
                Toggled  = true;
                if( Dir.Open && typeof Dir.Devs === "undefined" )
                    ServerCommand("ScanDevs",IF);
                return;
                }

            if( !Dir.Devs )
                return;

            Object.keys(BLEInfo.IFaces[IF].Devs).forEach(function (Dev) { 

                if( Toggled ) return;
                var Dir = BLEInfo.IFaces[IF].Devs[Dev];

                if( Dir.HTMLID === HTMLID ) {
                    Dir.Open = !Dir.Open;
                    Toggled  = true;
                    if( Dir.Open && typeof Dir.Services === "undefined" )
                        ServerCommand("ScanServices",IF,Dev);
                    return;
                    }

                if( !Dir.Services )
                    return;

                Object.keys(BLEInfo.IFaces[IF].Devs[Dev].Services).forEach(function (Serv) { 

                    if( Toggled ) return;
                    var Dir = BLEInfo.IFaces[IF].Devs[Dev].Services[Serv];

                    if( Dir.HTMLID === HTMLID ) {
                        Dir.Open = !Dir.Open;
                        Toggled  = true;
                        if( Dir.Open && typeof Dir.Chars === "undefined" )
                            ServerCommand("ScanChars",IF,Dev,Serv);
                        return;
                        }

                    if( !Dir.Chars )
                        return;

                    Object.keys(BLEInfo.IFaces[IF].Devs[Dev].Services[Serv].Chars).forEach(function (Char) { 

                        if( Toggled ) return;
                        var Dir = BLEInfo.IFaces[IF].Devs[Dev].Services[Serv].Chars[Char];

                        if( Dir.HTMLID === HTMLID ) {
                            Dir.Open = !Dir.Open;
                            Toggled  = true;
                            return;
                            }
                        });
                    });
                });
            });
        }

    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    //
    // DisplayBLEInfo - Display the BLE info tree
    //
    function DisplayBLEInfo() {

        var HTML;

        if     ( !BLEInfo.IFaces                          ) HTML = ScanningLine;
        else if( Object.keys(BLEInfo.IFaces).length ==  0 ) HTML = NoneLine;
        else                                                HTML = IFTable();

        document.getElementById("IFTable").innerHTML = HTML;                   // Always exists
        }

    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    //
    // IFTable - Return the HTML for the IF table
    //
    function IFTable() {

        var HTML = '<ul class="tree">';

        Object.keys(BLEInfo.IFaces).forEach(function (IF) { 

            var Dir    = BLEInfo.IFaces[IF];
            var SubDir = Dir.Devs;

            //
            // <input type="checkbox" $OPEN id="$HTMLIDInput" onclick="Toggle()" />
            // <label class="tree_label" for="$HTMLIDInput">$DIR</label>';
            //
            HTML += '<li>';
            HTML += DirLine.replaceAll("$OPEN"  ,Dir.Open ? "checked" : "")
                           .replaceAll("$DIR"   ,IF)
                           .replaceAll("$HTMLID",Dir.HTMLID);

            if     ( typeof SubDir              === 'undefined' ) HTML += ScanningLine;
            else if( Object.keys(SubDir).length ==  0           ) HTML += NoneLine;
            else return                                           HTML += DevTable(IF);

            HTML += "</li>";
            });

        HTML += "</ul>";

        return HTML;
        }

    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    //
    // DevTable - Return HTML of Device table for specific interface
    //
    // Inputs:  IFace of interest
    //
    // Outputs: Stringified HTML code for Dev table of IFace
    //
    function DevTable(IF) {

        var HTML = '<ul>';

        Object.keys(BLEInfo.IFaces[IF].Devs).forEach(function (Dev) { 

            var Dir    = BLEInfo.IFaces[IF].Devs[Dev];
            var SubDir = Dir.Services;

            //
            // <input type="checkbox" $OPEN id="$HTMLIDInput" onclick="Toggle()" />
            // <label class="tree_label" for="$HTMLIDInput">$DIR</label>';
            //
            HTML += '<li>';
            HTML += DirLine.replaceAll("$OPEN"  ,Dir.Open ? "checked" : "")
                           .replaceAll("$DIR"   ,"Device: " + Dev + ": " + Dir.Name)
                           .replaceAll("$HTMLID",Dir.HTMLID);

            if     ( typeof SubDir              === 'undefined' ) HTML += ScanningLine;
            else if( Object.keys(SubDir).length ==  0           ) HTML += NoneLine;
            else                                                  HTML += ServTable(IF,Dev);

            HTML += "</li>";
            });

        HTML += "</ul>";

        return HTML;
        }

    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    //
    // ServTable - Return HTML of Services table for specific interface and device
    //
    // Inputs:  IFace of interest
    //          Dev   of interest
    //
    // Outputs: Stringified HTML code for Services table for device
    //
    function ServTable(IF,Dev) {

        var HTML = '<ul>';

        Object.keys(BLEInfo.IFaces[IF].Devs[Dev].Services).forEach(function (Serv) { 
            var Dir    = BLEInfo.IFaces[IF].Devs[Dev].Services[Serv];
            var SubDir = Dir.Chars;

            //
            // <input type="checkbox" $OPEN id="$HTMLIDInput" onclick="Toggle()" />
            // <label class="tree_label" for="$HTMLIDInput">$DIR</label>';
            //
            HTML += '<li>';
            HTML += DirLine.replaceAll("$OPEN"  ,Dir.Open ? "checked" : "")
                           .replaceAll("$DIR"   ,"Service: " + Serv)
                           .replaceAll("$HTMLID",Dir.HTMLID);

            if     ( typeof SubDir              === 'undefined' ) HTML += ScanningLine;
            else if( Object.keys(SubDir).length ==  0           ) HTML += NoneLine;
            else                                                  HTML += CharTable(IF,Dev,Serv);

            HTML += "</li>";
            });

        HTML += "</ul>";

        return HTML;
        }

    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    //
    // CharTable - Return HTML of characteristics table for specific interface
    //
    // Inputs:  IFace   of interest
    //          Dev     of interest
    //          Service of interest
    //
    // Outputs: Stringified HTML code for Characteristics table for device
    //
    function CharTable(IF,Dev,Serv) {

        var HTML = '<ul>';

        Object.keys(BLEInfo.IFaces[IF].Devs[Dev].Services[Serv]).forEach(function (Char) { 

            var Dir    = BLEInfo.IFaces[IF].Devs[Dev].Services[Serv].Chars[Char];
            var SubDir = Dir.Values;

            //
            // <input type="checkbox" $OPEN id="$HTMLIDInput" onclick="Toggle()" />
            // <label class="tree_label" for="$HTMLIDInput">$DIR</label>';
            //
            HTML += '<li>';
            HTML += DirLine.replaceAll("$OPEN",Dir.Open ? "checked" : "")
                           .replaceAll("$DIR" ,"Char: " + Char)
                           .replaceAll("$HTMLID",Dir.HTMLID);

//            if     ( typeof SubDir              === 'undefined' ) HTML += ScanningLine;
//            else if( Object.keys(SubDir).length ==  0           ) HTML += NoneLine;
//            else                                                  HTML += CharTable(IF,Dev,Serv);

            HTML += "</li>";
            });

        HTML += "</ul>";

        return HTML;
        }
