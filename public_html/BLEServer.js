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
// BLEInfo                                             # Data supplied by the server
//     ->{Timeout}                                     # Timeout in seconds for commands (DEFAULT: 10)
//     ->{Hostname}                                    # System name (from /etc/hostname)
//     ->{IFaces}                                      # Available BLE interfaces
//         ->{$IF}                                     # Interface to scan             (ex: "hci0")
//             ->{IFace  }                             # Name of interface             (same as hash key)
//             ->{Address}                             # Address of interface
//             ->{Running}                             # TRUE if up and running
//             ->{Devs}                                # Scanned devices
//                 ->{$Dev}                            # BLE device ID                 (ex: "84:2E:14:87:66:97")
//                     ->{ID}                          # Device ID                     (same as hash key)
//                     ->{Name}                        # Name of device                (ex: "Jovan Heart Monitor")
//                     ->{Names}[]                     # Array of names returned in scan
//                     ->{Services}                    # Services available
//                         ->{$UUID}                   # UUID of service               (ex: "00001801-0000-1000-8000-00805f9b34fb")
//                             ->{UUID}                # Service UUID                  (same as hash key)
//                             ->{Service}             # First 8 hex digits of UUID    (ex: "00001801")
//                             ->{HDStart}             # Start of characteristics
//                             ->{HDEnd}               # End   of characteristics
//                             ->{Chars}               # List of available characteristics
//                                 ->{$Char}           # Handle for this char          (ex: "0002")
//                                     ->{Handle}      # Handle                        (same as hash key)
//                                     ->{VHandle}     # Handle for value
//                                     ->{Properties}  # R/W, etc
//                                     ->{UUID}        # Full UUID of characteristic   (ex: "00001801-0000-1000-8000-00805f9b34fb")
//                                     ->{Service}     # First 8 digits of char UUID   (ex: "00001801")
//                                     ->{Values}      # List of seen values
//
// BLETree              # Info tracking one directory item
//      .Type           # Text type of directory object                     (ex: "IF")
//      .Prefix         # Char prefix to make HTML compatible ID from name  (ex: "I" for IFace)
//      .Name           # Actual dir name                                   (ex: "hci0")
//      .Dir            # Entry in BLEInfo that describes this dir          (ex: BLEInfo.IFaces.{"hci0"})
//      .Parent         # Pointer to parent object in BLETree
//      .HTMLID         # Prefix plus name, for HTML ID's                   (ex: "Ihci0")
//      .Open           # T/F based on checkbox open/closed
//      .Scanned        # T if we ever asked server to scan
//      .SubDir         # If scanned, subdir of TreeDir objects
//
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

    var ConfigSystem = location.hostname;
    var ConfigAddr   = "ws:" + ConfigSystem + ":2021";

    var ConfigSocket;
    var ConfigData;

    var WindowWidth;
    var WindowHeight;

    var BLEInfo;
    var BLETree;

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
                BLETree = new BLEDir(BLEInfo);

                HostnameElements = document.getElementsByClassName("Hostname");
                for (i = 0; i < HostnameElements.length; i++) {
                    HostnameElements[i].innerHTML = BLEInfo.Hostname;
                    };

                DisplayBLETree();
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
                BLETree = new BLEDir(BLEInfo);
                DisplayBLETree();
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
    function PopulateMainPage() {}

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
    // Toggle - Toggle one individual dir Open <-> Closed
    //
    // Inputs:  Object that was toggled
    //
    // Outputs: None. Open is changed in place.
    //
    function Toggle(self) {
        var HTMLID = self.id;

        BLETree.Find(HTMLID).Toggle();
        }

    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    //
    // DisplayBLETree - Display the BLE info tree
    //
    function DisplayBLETree() {
console.log(BLETree);

        document.getElementById("IFTable").innerHTML = BLETree.DirLine();
        }

    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    //
    // TreeDir - Base class for tree structure containing directory-like elements
    //
    class TreeDir {

        constructor(Type,Prefix,Name,Dir,SubDir,DataFunc,Parent) {
            this.Type   = Type;             // ex: "IF"
            this.Prefix = Prefix;           // ex: "I"
            this.Name   = Name;             // ex: "hci0"
            this.Dir    = Dir;              // ex: [...].IFaces[$IF]
            this.Parent = Parent;

            this.HTMLID = this.Prefix + this.Name;
            this.SetOpen();

            this.Scanned = false;
            this.SubDir  = {};              // ex: Dir.Devs
            if( !SubDir )
                return;

            this.Scanned = true;            // Subdir exists (but may be empty)
            Object.keys(SubDir).sort().forEach(function (Elem) { 
                var SubTree = new DataFunc(SubDir[Elem],this);
                this.SubDir[SubTree.Name] = SubTree;
                },this);
            }

        ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
        //
        // SetOpen - Set Dir open state based on existing checkbox
        //
        SetOpen() {

            this.Open    = false;
            var Checkbox = document.getElementById(this.HTMLID);

            if( Checkbox )
                this.Open = Checkbox.checked;
            }

        ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
        //
        // DirLine - Return the HTML for the directory line of this Dir
        //
        DirLine() {
            var HTML = "";

            HTML += '<li>';
            HTML += TreeDir.DirLineTemplate.replaceAll("$OPEN"  ,this.Open ? "checked" : "")
                                           .replaceAll("$DIR"   ,this.DataLine())
                                           .replaceAll("$HTMLID",this.HTMLID);

            HTML += "<ul>"
            if     ( !this.Scanned                         ) HTML += TreeDir.ScanningLine;
            else if( Object.keys(this.SubDir).length ==  0 ) HTML += TreeDir.NoneLine;
            else {
                for (const Entry of Object.keys(this.SubDir).sort())
                    HTML += this.SubDir[Entry].DirLine();
                }
            HTML += "</ul>";

            HTML += "</li>";
            return HTML;
            }

        ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
        //
        // DataLine - Return the HTML for the data within the DIR line.
        //
        DataLine() {
            return this.Name;
            }

        ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
        //
        // Find - Find the Dir with the specified HTMLID
        //
        Find(HTMLID) {

            if( HTMLID == this.HTMLID )
                return this;

            if( !this.SubDir )
                return null;

            for (const Entry of Object.keys(this.SubDir)) {

                var Dir = this.SubDir[Entry].Find(HTMLID);
                if( Dir )
                    return Dir;
                }

            return null;
            }

        ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
        //
        // Toggle - Togle the open/closed state
        //
        Toggle() {
            this.SetOpen();         // Gets current value from checkbox

            if( this.Open && !this.Scanned )
                this.ServerScan();
            }

        ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
        //
        // AddrHTML - Format a BLE device address
        // UUIDHTML - Format a UUID
        // NameHTML - Format a device name
        //
        AddrHTML(Arg) { return '<span class="Addr">' + Arg + "</span>"; }
        UUIDHTML(Arg) { return '<span class="UUID">' + Arg + "</span>"; }
        NameHTML(Arg) { return '<span class="Name">' + Arg + "</span>"; }

        //
        // Directory list line
        //
        static DirLineTemplate = '\
            <input type="checkbox" $OPEN id="$HTMLID" onclick="Toggle(this)" />   \
            <label class="tree_label" for="$HTMLID">$DIR</label>';

        //
        // "Scanning" mode line
        //
        static ScanningLine = '\
            <ul><li><span class="tree_label">Scanning...</span></li></ul>';

        //
        // "None" mode line
        //
        static NoneLine = '\
            <ul><li><span class="tree_label">None.</span></li></ul>';

        //
        // Span with non-proportional text
        //
        static MonoSpan = '\
            <span class="Mono">$DATA</span>';
        }

    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    //
    // BLEDir - Top-level directory structure for BLEInfo
    //
    class BLEDir extends TreeDir {

        constructor(Dir) {
            super("BLE","B","BLEInfo",Dir,Dir.IFaces,IFDir,null);
            }

        ServerScan() {
            ServerCommand("ScanIFs");
            }

        ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
        //
        // DirLine - Top level has no checkbox. Also, UL is tree class
        //
        DirLine() {
            var HTML = "";

            HTML += '<ul class="tree">';

            if     ( !this.Scanned                         ) HTML += TreeDir.ScanningLine;
            else if( Object.keys(this.SubDir).length ==  0 ) HTML += TreeDir.NoneLine;
            else {
                for (const Entry of Object.keys(this.SubDir).sort())
                    HTML += this.SubDir[Entry].DirLine();
                }

            HTML += "</ul>";
            return HTML;
            }
        }

    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    //
    // IFDir - Interface directory
    //
    class IFDir extends TreeDir {

        constructor(Dir,Parent) {
            super("IF","I",Dir.IFace,Dir,Dir.Devs,DevDir,Parent);
            }

        ServerScan() {
            ServerCommand("ScanDevs",this.Name);
            }
        }

    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    //
    // DevDir - Device directory
    //
    class DevDir extends TreeDir {

        constructor(Dir,Parent) {
            super("Dev","D",Dir.ID,Dir,Dir.Services,ServDir,Parent);
            }

        ServerScan() {
            ServerCommand("ScanServices",this.Parent.Name,
                                         this.Name);
            }

        DataLine() {
            return this.AddrHTML(this.Name) + ": " + this.NameHTML(this.Dir.Name);
            }
        }

    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    //
    // ServDir - Service directory
    //
    class ServDir extends TreeDir {

        constructor(Dir,Parent) {
            super("Serv","S",Dir.UUID,Dir,Dir.Chars,CharDir,Parent);
            }

        ServerScan() {
            ServerCommand("ScanChars",this.Parent.Parent.Name,
                                      this.Parent.Name,
                                      this.Name);
            }

        DataLine() {
            return this.UUIDHTML(this.Name);
            }
        }

    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    //
    // CharDir - Characteristic directory
    //
    class CharDir extends TreeDir {

        constructor(Dir,Parent) {
            super("Char","C",Dir.Handle,Dir,Dir.Values,ValueDir,Parent);
            }

        ServerScan() {
            ServerCommand("GetValue",this.Parent.Parent.Parent.Name,
                                     this.Parent.Parent.Name,
                                     this.Parent.Name,
                                     this.Name);
            }
        }

    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    //
    // ValueDir - Value directory
    //
    class ValueDir extends TreeDir {

        constructor(Dir,Parent) {
            super("Val","V","Value",Dir,{},0,Parent);
            }
        }
