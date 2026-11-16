/**
 * Kenya administrative units: 47 counties, 290 constituencies, 1,450 wards.
 * Source: The National Assembly Constituencies and County Assembly Wards
 * Order, 2012 (Legal Notice 14 of 2012). Names are title-cased; county codes
 * are the official 1 to 47 numbering. Generated data: do not edit by hand.
 */
type RawCounty = [code: number, name: string, constituencies: Array<[name: string, wards: string[]]>];

// prettier-ignore
const RAW: RawCounty[] = [
  [1,"Mombasa",[["Changamwe",["Port Reitz","Kipevu","Airport","Changamwe","Chaani"]],["Jomvu",["Jomvu Kuu","Miritini","Mikindani"]],["Kisauni",["Mjambere","Junda","Bamburi","Mwakirunge","Mtopanga","Magogoni","Shanzu"]],["Nyali",["Frere Town","Ziwa La Ng'ombe","Mkomani","Kongowea","Kadzandani"]],["Likoni",["Mtongwe","Shika Adabu","Bofu","Likoni","Timbwani"]],["Mvita",["Mji Wa Kale/Makadara","Tudor","Tononoka","Shimanzi/Ganjoni","Majengo"]]]],
  [2,"Kwale",[["Msambweni",["Gombatobongwe","Ukunda","Kinondo","Ramisi"]],["Lungalunga",["Pongwekikoneni","Dzombo","Mwereni","Vanga"]],["Matuga",["Tsimba Golini","Waa","Tiwi","Kubo South","Mkongani"]],["Kinango",["Nadavaya","Puma","Kinango","Mackinnon-Road","Chengoni/Samburu","Mwavumbo","Kasemeni"]]]],
  [3,"Kilifi",[["Kilifi North",["Tezo","Sokoni","Kibarani","Dabaso","Matsangoni","Watamu","Mnarani"]],["Kilifi South",["Junju","Mwarakaya","Shimo La Tewa","Chasimba","Mtepeni"]],["Kaloleni",["Mariakani","Kayafungo","Kaloleni","Mwanamwinga"]],["Rabai",["Mwawesa","Ruruma","Kambe/Ribe","Rabai/Kisurutini"]],["Ganze",["Ganze","Bamba","Jaribuni","Sokoke"]],["Malindi",["Jilore","Kakuyuni","Ganda","Malindi Town","Shella"]],["Magarini",["Marafa","Magarini","Gongoni","Adu","Garashi","Sabaki"]]]],
  [4,"Tana River",[["Garsen",["Kipini East","Garsen South","Kipini West","Garsen Central","Garsen West","Garsen North"]],["Galole",["Kinakomba","Mikinduni","Chewani","Wayu"]],["Bura",["Chewele","Bura","Bangale","Sala","Madogo"]]]],
  [5,"Lamu",[["Lamu East",["Faza","Kiunga","Basuba"]],["Lamu West",["Shella","Mkomani","Hindi","Mkunumbi","Hongwe","Witu","Bahari"]]]],
  [6,"Taita Taveta",[["Taveta",["Chala","Mahoo","Bomeni","Mboghoni","Mata"]],["Wundanyi",["Wundanyi/Mbale","Werugha","Wumingu/Kishushe","Mwanda/Mgange"]],["Mwatate",["Rong'e","Mwatate","Bura","Chawia","Wusi/Kishamba"]],["Voi",["Mbololo","Sagalla","Kaloleni","Marungu","Kasigau","Ngolia"]]]],
  [7,"Garissa",[["Garissa Township",["Waberi","Galbet","Township","Iftin"]],["Balambala",["Balambala","Danyere","Jara Jara","Saka","Sankuri"]],["Lagdera",["Modogashe","Benane","Goreale","Maalimin","Sabena","Baraki"]],["Dadaab",["Dertu","Dadaab","Labasigale","Damajale","Liboi","Abakaile"]],["Fafi",["Bura","Dekaharia","Jarajila","Fafi","Nanighi"]],["Ijara",["Hulugho","Sangailu","Ijara","Masalani"]]]],
  [8,"Wajir",[["Wajir North",["Gurar","Bute","Korondile","Malkagufu","Batalu","Danaba","Godoma"]],["Wajir East",["Wagberi","Township","Barwago","Khorof/Harar"]],["Tarbaj",["Elben","Sarman","Tarbaj","Wargadud"]],["Wajir West",["Arbajahan","Hadado/Athibohol","Ademasajide","Wagalla/Ganyure"]],["Eldas",["Eldas","Della","Lakoley South/Basir","Elnur/Tula Tula"]],["Wajir South",["Benane","Burder","Dadaja Bulla","Habasswein","Lagboghol South","Ibrahim Ure","Diif"]]]],
  [9,"Mandera",[["Mandera West",["Takaba South","Takaba","Lag Sure","Dandu","Gither"]],["Banissa",["Banissa","Derkhale","Guba","Malkamari","Kiliwehiri"]],["Mandera North",["Ashabito","Guticha","Morothile","Rhamu","Rhamu-Dimtu"]],["Mandera South",["Wargudud","Kutulo","Elwak South","Elwak North","Shimbir Fatuma"]],["Mandera East",["Arabia","Bulla Mpya","Khalalio","Neboi","Township"]],["Lafey",["Libehia","Fino","Lafey","Warankara","Alungo Gof"]]]],
  [10,"Marsabit",[["Moyale",["Butiye","Sololo","Heilu-Manyatta","Golbo","Moyale Township","Uran","Obbu"]],["North Horr",["Illeret","North Horr","Dukana","Maikona","Turbi"]],["Saku",["Sagante/Jaldesa","Karare","Marsabit Central"]],["Laisamis",["Loiyangalani","Kargi/South Horr","Korr/Ngurunit","Log Logo","Laisamis"]]]],
  [11,"Isiolo",[["Isiolo North",["Wabera","Bulla Pesa","Chari","Cherab","Ngare Mara","Burat","Oldonyiro"]],["Isiolo South",["Garbatulla","Kinna","Sericho"]]]],
  [12,"Meru",[["Igembe South",["Maua","Kiegoi/Antubochiu","Athiru Gaiti","Akachiu","Kanuni"]],["Igembe Central",["Akirang'ondu","Athiru Ruujine","Igembe East","Njia","Kangeta"]],["Igembe North",["Antuambui","Ntunene","Antubetwe Kiongo","Naathu","Amwathi"]],["Tigania West",["Athwana","Akithii","Kianjai","Nkomo","Mbeu"]],["Tigania East",["Thangatha","Mikinduri","Kiguchwa","Muthara","Karama"]],["North Imenti",["Municipality","Ntima East","Ntima West","Nyaki West","Nyaki East"]],["Buuri",["Timau","Kisima","Kiirua/Naari","Ruiri/Rwarera","Kibirichia"]],["Central Imenti",["Mwanganthia","Abothuguchi Central","Abothuguchi West","Kiagu"]],["South Imenti",["Mitunguu","Igoji East","Igoji West","Abogeta East","Abogeta West","Nkuene"]]]],
  [13,"Tharaka-Nithi",[["Maara",["Mitheru","Muthambi","Mwimbi","Ganga","Chogoria"]],["Chuka/Igambang'om",["Mariani","Karingani","Magumoni","Mugwe","Igambang'ombe"]],["Tharaka",["Gatunga","Mukothima","Nkondi","Chiakariga","Marimanti"]]]],
  [14,"Embu",[["Manyatta",["Ruguru/Ngandori","Kithimu","Nginda","Mbeti North","Kirimari","Gaturi South"]],["Runyenjes",["Gaturi North","Kagaari South","Central Ward","Kagaari North","Kyeni North","Kyeni South"]],["Mbeere South",["Mwea","Makima","Mbeti South","Mavuria","Kiambere"]],["Mbeere North",["Nthawa","Muminji","Evurore"]]]],
  [15,"Kitui",[["Mwingi North",["Ngomeni","Kyuso","Mumoni","Tseikuru","Tharaka"]],["Mwingi West",["Kyome/Thaana","Nguutani","Migwani","Kiomo/Kyethani"]],["Mwingi Central",["Central","Kivou","Nguni","Nuu","Mui","Waita"]],["Kitui West",["Mutonguni","Kauwi","Matinyani","Kwa Mutonga/Kithumula"]],["Kitui Rural",["Kisasi","Mbitini","Kwavonza/Yatta","Kanyangi"]],["Kitui Central",["Miambani","Township","Kyangwithya West","Mulango","Kyangwithya East"]],["Kitui East",["Zombe/Mwitika","Chuluni","Nzambani","Voo/Kyamatu","Endau/Malalani","Mutito/Kaliku"]],["Kitui South",["Ikanga/Kyatune","Mutomo","Mutha","Ikutha","Kanziko","Athi"]]]],
  [16,"Machakos",[["Masinga",["Kivaa","Masinga Central","Ekalakala","Muthesya","Ndithini"]],["Yatta",["Ndalani","Matuu","Kithimani","Ikombe","Katangi"]],["Kangundo",["Kangundo North","Kangundo Central","Kangundo East","Kangundo West"]],["Matungulu",["Tala","Matungulu North","Matungulu East","Matungulu West","Kyeleni"]],["Kathiani",["Mitaboni","Kathiani Central","Upper Kaewa/Iveti","Lower Kaewa/Kaani"]],["Mavoko",["Athi River","Kinanie","Muthwani","Syokimau/Mulolongo"]],["Machakos Town",["Kalama","Mua","Mutituni","Machakos Central","Mumbuni North","Muvuti/Kiima-Kimwe","Kola"]],["Mwala",["Mbiuni","Makutano/Mwala","Masii","Muthetheni","Wamunyu","Kibauni"]]]],
  [17,"Makueni",[["Mbooni",["Tulimani","Mbooni","Kithungo/Kitundu","Kisau/Kiteta","Waia/Kako","Kalawa"]],["Kilome",["Kasikeu","Mukaa","Kiima Kiu/Kalanzoni"]],["Kaiti",["Ukia","Kee","Kilungu","Ilima"]],["Makueni",["Wote","Muvau/Kikuumini","Mavindini","Kitise/Kithuki","Kathonzweni","Nzaui/Kilili/Kalamba","Mbitini"]],["Kibwezi West",["Makindu","Nguumo","Kikumbulyu North","Kikumbulyu South","Nguu/Masumba","Emali/Mulala"]],["Kibwezi East",["Masongaleni","Mtito Andei","Thange","Ivingoni/Nzambani"]]]],
  [18,"Nyandarua",[["Kinangop",["Engineer","Gathara","North Kinangop","Murungaru","Njabini\\kiburu","Nyakio","Githabai","Magumu"]],["Kipipiri",["Wanjohi","Kipipiri","Geta","Githioro"]],["Ol Kalou",["Karau","Kanjuiri Ridge","Mirangine","Kaimbaga","Rurii"]],["Ol Jorok",["Gathanji","Gatimu","Weru","Charagita"]],["Ndaragwa",["Leshau Pondo","Kiriita","Central","Shamata"]]]],
  [19,"Nyeri",[["Tetu",["Dedan Kimanthi","Wamagana","Aguthi/Gaaki"]],["Kieni",["Mweiga","Naromoru Kiamathaga","Mwiyogo/Endarasha","Mugunda","Gatarakwa","Thegu River","Kabaru","Gakawa"]],["Mathira",["Ruguru","Magutu","Iriaini","Konyu","Kirimukuyu","Karatina Town"]],["Othaya",["Mahiga","Iria-Ini","Chinga","Karima"]],["Mukurweini",["Gikondi","Rugi","Mukurwe-Ini West","Mukurwe-Ini Central"]],["Nyeri Town",["Kiganjo/Mathari","Rware","Gatitu/Muruguru","Ruring'u","Kamakwa/Mukaro"]]]],
  [20,"Kirinyaga",[["Mwea",["Mutithi","Kangai","Thiba","Wamumu","Nyangati","Murinduko","Gathigiriri","Tebere"]],["Gichugu",["Kabare","Baragwi","Njukiini","Ngariama","Karumandi"]],["Ndia",["Mukure","Kiine","Kariti"]],["Kirinyaga Central",["Mutira","Kanyeki-Ini","Kerugoya","Inoi"]]]],
  [21,"Murang'a",[["Kangema",["Kanyenyaini","Muguru","Rwathia"]],["Mathioya",["Gitugi","Kiru","Kamacharia"]],["Kiharu",["Wangu","Mugoiri","Mbiri","Township","Murarandia","Gaturi"]],["Kigumo",["Kahumbu","Muthithi","Kigumo","Kangari","Kinyona"]],["Maragwa",["Kimorori/Wempa","Makuyu","Kambiti","Kamahuha","Ichagaki","Nginda"]],["Kandara",["Ng'araria","Muruka","Kagundu-Ini","Gaichanjiru","Ithiru","Ruchu"]],["Gatanga",["Ithanga","Kakuzi/Mitubiri","Mugumo-Ini","Kihumbu-Ini","Gatanga","Kariara"]]]],
  [22,"Kiambu",[["Gatundu South",["Kiamwangi","Kiganjo","Ndarugu","Ngenda"]],["Gatundu North",["Gituamba","Githobokoni","Chania","Mang'u"]],["Juja",["Murera","Theta","Juja","Witeithie","Kalimoni"]],["Thika Town",["Township","Kamenu","Hospital","Gatuanyaga","Ngoliba"]],["Ruiru",["Gitothua","Biashara","Gatongora","Kahawa Sukari","Kahawa Wendani","Kiuu","Mwiki","Mwihoko"]],["Githunguri",["Githunguri","Githiga","Ikinu","Ngewa","Komothai"]],["Kiambu",["Ting'ang'a","Ndumberi","Riabai","Township"]],["Kiambaa",["Cianda","Karuri","Ndenderu","Muchatha","Kihara"]],["Kabete",["Gitaru","Muguga","Nyadhuna","Kabete","Uthiru"]],["Kikuyu",["Karai","Nachu","Sigona","Kikuyu","Kinoo"]],["Limuru",["Bibirioni","Limuru Central","Ndeiya","Limuru East","Ngecha Tigoni"]],["Lari",["Kinale","Kijabe","Nyanduma","Kamburu","Lari/Kirenga"]]]],
  [23,"Turkana",[["Turkana North",["Kaeris","Lake Zone","Lapur","Kaaleng/Kaikor","Kibish","Nakalale"]],["Turkana West",["Kakuma","Lopur","Letea","Songot","Kalobeyei","Lokichoggio","Nanaam"]],["Turkana Central",["Kerio Delta","Kang'atotha","Kalokol","Lodwar Township","Kanamkemer"]],["Loima",["Kotaruk/Lobei","Turkwel","Loima","Lokiriama/Lorengippi"]],["Turkana South",["Kaputir","Katilu","Lobokat","Kalapata","Lokichar"]],["Turkana East",["Kapedo/Napeitom","Katilia","Lokori/Kochodin"]]]],
  [24,"West Pokot",[["Kapenguria",["Riwo","Kapenguria","Mnagei","Siyoi","Endugh","Sook"]],["Sigor",["Sekerr","Masool","Lomut","Weiwei"]],["Kacheliba",["Suam","Kodich","Kapckok","Kasei","Kiwawa","Alale"]],["Pokot South",["Chepareria","Batei","Lelan","Tapach"]]]],
  [25,"Samburu",[["Samburu West",["Lodokejek","Suguta Marmar","Maralal","Loosuk","Poro"]],["Samburu North",["El-Barta","Nachola","Ndoto","Nyiro","Angata Nanyokie","Baawa"]],["Samburu East",["Waso","Wamba West","Wamba East","Wamba North"]]]],
  [26,"Trans Nzoia",[["Kwanza",["Kapomboi","Kwanza","Keiyo","Bidii"]],["Endebess",["Chepchoina","Endebess","Matumbei"]],["Saboti",["Kinyoro","Matisi","Tuwani","Saboti","Machewa"]],["Kiminini",["Kiminini","Waitaluk","Sirende","Hospital","Sikhendu","Nabiswa"]],["Cherangany",["Sinyerere","Makutano","Kaplamai","Motosiet","Cherangany/Suwerwa","Chepsiro/Kiptoror","Sitatunga"]]]],
  [27,"Uasin Gishu",[["Soy",["Moi's Bridge","Kapkures","Ziwa","Segero/Barsombe","Kipsomba","Soy","Kuinet/Kapsuswa"]],["Turbo",["Ngenyilel","Tapsagoi","Kamagut","Kiplombe","Kapsaos","Huruma"]],["Moiben",["Tembelio","Sergoit","Karuna/Meibeki","Moiben","Kimumu"]],["Ainabkoi",["Kapsoya","Kaptagat","Ainabkoi/Olare"]],["Kapseret",["Simat/Kapseret","Kipkenyo","Ngeria","Megun","Langas"]],["Kesses",["Racecourse","Cheptiret/Kipchamo","Tulwet/Chuiyat","Tarakwa"]]]],
  [28,"Elgeyo/Marakwet",[["Marakwet East",["Kapyego","Sambirir","Endo","Embobut/Embulot"]],["Marakwet West",["Lelan","Sengwer","Cherang'any/Chebororwa","Moiben/Kuserwo","Kapsowar","Arror"]],["Keiyo North",["Emsoo","Kamariny","Kapchemutwa","Tambach"]],["Keiyo South",["Kaptarakwa","Chepkorio","Soy North","Soy South","Kabiemit","Metkei"]]]],
  [29,"Nandi",[["Tinderet",["Songhor/Soba","Tindiret","Chemelil/Chemase","Kapsimotwo"]],["Aldai",["Kabwareng","Terik","Kemeloi-Maraba","Kobujoi","Kaptumo-Kaboi","Koyo-Ndurio"]],["Nandi Hills",["Nandi Hills","Chepkunyuk","Ol'lessos","Kapchorua"]],["Chesumei",["Chemundu/Kapng'etuny","Kosirai","Lelmokwo/Ngechek","Kaptel/Kamoiywo","Kiptuya"]],["Emgwen",["Chepkumia","Kapkangani","Kapsabet","Kilibwoni"]],["Mosop",["Chepterwai","Kipkaren","Kurgung/Surungai","Kabiyet","Ndalat","Kabisaga","Sangalo/Kebulonik"]]]],
  [30,"Baringo",[["Tiaty",["Tirioko","Kolowa","Ribkwo","Silale","Loiyamorock","Tangulbei/Korossi","Churo/Amaya"]],["Baringo North",["Barwessa","Kabartonjo","Saimo/Kipsaraman","Saimo/Soi","Bartabwa"]],["Baringo Central",["Kabarnet","Sacho","Tenges","Ewalel Chapchap","Kapropita"]],["Baringo South",["Marigat","Ilchamus","Mochongoi","Mukutani"]],["Mogotio",["Mogotio","Emining","Kisanana"]],["Eldama Ravine",["Lembus","Lembus Kwen","Ravine","Mumberes/Maji Mazuri","Lembus/Perkerra","Koibatek"]]]],
  [31,"Laikipia",[["Laikipia West",["Olmoran","Rumuruti Township","Kinamba","Marmanet","Igwamiti","Salama"]],["Laikipia East",["Ngobit","Tigithi","Thingithu","Nanyuki","Umande"]],["Laikipia North",["Sosian","Segera","Mukogondo West","Mukogondo East"]]]],
  [32,"Nakuru",[["Molo",["Mariashoni","Elburgon","Turi","Molo"]],["Njoro",["Maunarok","Mauche","Kihingo","Nessuit","Lare","Njoro"]],["Naivasha",["Biashara","Hells Gate","Lakeview","Maai-Mahiu","Maiella","Olkaria","Naivasha East","Viwandani"]],["Gilgil",["Gilgil","Elementaita","Mbaruk/Eburu","Malewa West","Murindati"]],["Kuresoi South",["Amalo","Keringet","Kiptagich","Tinet"]],["Kuresoi North",["Kiptororo","Nyota","Sirikwa","Kamara"]],["Subukia",["Subukia","Waseges","Kabazi"]],["Rongai",["Menengai West","Soin","Visoi","Mosop","Solai"]],["Bahati",["Dundori","Kabatini","Kiamaina","Lanet/Umoja","Bahati"]],["Nakuru Town West",["Barut","London","Kaptembwo","Kapkures","Rhoda","Shaabab"]],["Nakuru Town East",["Biashara","Kivumbini","Flamingo","Menengai","Nakuru East"]]]],
  [33,"Narok",[["Kilgoris",["Kilgoris Central","Keyian","Angata Barikoi","Shankoe","Kimintet","Lolgorian"]],["Emurua Dikirr",["Ilkerin","Ololmasani","Mogondo","Kapsasian"]],["Narok North",["Olpusimoru","Olokurto","Narok Town","Nkareta","Olorropil","Melili"]],["Narok East",["Mosiro","Ildamat","Keekonyokie","Suswa"]],["Narok South",["Majimoto/Naroosura","Ololulung'a","Melelo","Loita","Sogoo","Sagamian"]],["Narok West",["Ilmotiok","Mara","Siana","Naikarra"]]]],
  [34,"Kajiado",[["Kajiado North",["Olkeri","Ongata Rongai","Nkaimurunya","Oloolua","Ngong"]],["Kajiado Central",["Purko","Ildamat","Dalalekutuk","Matapato North","Matapato South"]],["Kajiado East",["Kaputiei North","Kitengela","Oloosirkon/Sholinke","Kenyawa-Poka","Imaroro"]],["Kajiado West",["Keekonyokie","Iloodokilani","Magadi","Ewuaso Oonkidong'i","Mosiro"]],["Kajiado South",["Entonet/Lenkisim","Mbirikani/Eselenkei","Kuku","Rombo","Kimana"]]]],
  [35,"Kericho",[["Kipkelion East",["Londiani","Kedowa/Kimugul","Chepseon","Tendeno/Sorget"]],["Kipkelion West",["Kunyak","Kamasian","Kipkelion","Chilchila"]],["Ainamoi",["Kapsoit","Ainamoi","Kapkugerwet","Kipchebor","Kipchimchim","Kapsaos"]],["Bureti",["Kisiara","Tebesonik","Cheboin","Chemosot","Litein","Cheplanget","Kapkatet"]],["Belgut",["Waldai","Kabianga","Cheptororiet/Seretut","Chaik","Kapsuser"]],["Sigowet/Soin",["Sigowet","Kaplelartet","Soliat","Soin"]]]],
  [36,"Bomet",[["Sotik",["Ndanai/Abosi","Chemagel","Kipsonoi","Kapletundo","Rongena/Manaret"]],["Chepalungu",["Kong'asis","Nyangores","Sigor","Chebunyo","Siongiroi"]],["Bomet East",["Merigi","Kembu","Longisa","Kipreres","Chemaner"]],["Bomet Central",["Silibwet Township","Ndaraweta","Singorwet","Chesoen","Mutarakwa"]],["Konoin",["Chepchabas","Kimulot","Mogogosiek","Boito","Embomos"]]]],
  [37,"Kakamega",[["Lugari",["Mautuma","Lugari","Lumakanda","Chekalini","Chevaywa","Lwandeti"]],["Likuyani",["Likuyani","Sango","Kongoni","Nzoia","Sinoko"]],["Malava",["West Kabras","Chemuche","East Kabras","Butali/Chegulo","Manda-Shivanga","Shirugu-Mugai","South Kabras"]],["Lurambi",["Butsotso East","Butsotso South","Butsotso Central","Sheywe","Mahiakalo","Shirere"]],["Navakholo",["Ingostse-Mathia","Shinoyi-Shikomari-","Bunyala West","Bunyala East","Bunyala Central"]],["Mumias West",["Mumias Central","Mumias North","Etenje","Musanda"]],["Mumias East",["Lubinu/Lusheya","Isongo/Makunga/Malaha","East Wanga"]],["Matungu",["Koyonzo","Kholera","Khalaba","Mayoni","Namamali"]],["Butere",["Marama West","Marama Central","Marenyo-Shianda","Marama North","Marama South"]],["Khwisero",["Kisa North","Kisa East","Kisa West","Kisa Central"]],["Shinyalu",["Isukha North","Murhanda","Isukha Central","Isukha South","Isukha East","Isukha West"]],["Ikolomani",["Idakho South","Idakho East","Idakho North","Idakho Central"]]]],
  [38,"Vihiga",[["Vihiga",["Lugaga-Wamuluma","South Maragoli","Central Maragoli","Mungoma"]],["Sabatia",["Lyaduywa/Izava","West Sabatia","Chavakali","North Maragoli","Wodanga","Busali"]],["Hamisi",["Shiru","Muhudu","Shamakhokho","Gisambai","Banja","Tambua","Jepkoyai"]],["Luanda",["Luanda Township","Wemilabi","Mwibona","Luanda South","Emabungo"]],["Emuhaya",["North East Bunyore","Central Bunyore","West Bunyore"]]]],
  [39,"Bungoma",[["Mt.elgon",["Cheptais","Chesikaki","Chepyuk","Kapkateny","Kaptama","Elgon"]],["Sirisia",["Namwela","Malakisi/South Kulisiru","Lwandanyi"]],["Kabuchai",["Kabuchai/Chwele","West Nalondo","Bwake/Luuya","Mukuyuni"]],["Bumula",["South Bukusu","Bumula","Khasoko","Kabula","Kimaeti","West Bukusu","Siboti"]],["Kanduyi",["Bukembe West","Bukembe East","Township","Khalaba","Musikoma","East Sang'alo","Marakaru/Tuuti","Sang'alo West"]],["Webuye East",["Mihuu","Ndivisi","Maraka"]],["Webuye West",["Misikhu","Sitikho","Matulo","Bokoli"]],["Kimilili",["Kimilili","Kibingei","Maeni","Kamukuywa"]],["Tongaren",["Mbakalo","Naitiri/Kabuyefwe","Milima","Ndalu/Tabani","Tongaren","Soysambu/Mitua"]]]],
  [40,"Busia",[["Teso North",["Malaba Central","Malaba North","Ang'urai South","Ang'urai North","Ang'urai East","Malaba South"]],["Teso South",["Ang'orom","Chakol South","Chakol North","Amukura West","Amukura East","Amukura Central"]],["Nambale",["Nambale Township","Bukhayo North/Waltsi","Bukhayo East","Bukhayo Central"]],["Matayos",["Bukhayo West","Mayenje","Matayos South","Busibwabo","Burumba"]],["Butula",["Marachi West","Kingandole","Marachi Central","Marachi East","Marachi North","Elugulu"]],["Funyula",["Namboboto Nambuku","Nangina","Ageng'a Nanguba","Bwiri"]],["Budalangi",["Bunyala Central","Bunyala North","Bunyala West","Bunyala South"]]]],
  [41,"Siaya",[["Ugenya",["West Ugenya","Ukwala","North Ugenya","East Ugenya"]],["Ugunja",["Sidindi","Sigomere","Ugunja"]],["Alego Usonga",["Usonga","West Alego","Central Alego","Siaya Township","North Alego","South East Alego"]],["Gem",["North Gem","West Gem","Central Gem","Yala Township","East Gem","South Gem"]],["Bondo",["West Yimbo","Central Sakwa","South Sakwa","Yimbo East","West Sakwa","North Sakwa"]],["Rarieda",["East Asembo","West Asembo","North Uyoma","South Uyoma","West Uyoma"]]]],
  [42,"Kisumu",[["Kisumu East",["Kajulu","Kolwa East","Manyatta 'b'","Nyalenda 'a'","Kolwa Central"]],["Kisumu West",["South West Kisumu","Central Kisumu","Kisumu North","West Kisumu","North West Kisumu"]],["Kisumu Central",["Railways","Migosi","Shaurimoyo Kaloleni","Market Milimani","Kondele","Nyalenda B"]],["Seme",["West Seme","Central Seme","East Seme","North Seme"]],["Nyando",["East Kano/Wawidhi","Awasi/Onjiko","Ahero","Kabonyo/Kanyagwal","Kobura"]],["Muhoroni",["Miwani","Ombeyi","Masogo/Nyang'oma","Chemelil","Muhoroni/Koru"]],["Nyakach",["South West Nyakach","North Nyakach","Central Nyakach","West Nyakach","South East Nyakach"]]]],
  [43,"Homa Bay",[["Kasipul",["West Kasipul","South Kasipul","Central Kasipul","East Kamagak","West Kamagak"]],["Kabondo Kasipul",["Kabondo East","Kabondo West","Kokwanyo/Kakelo","Kojwach"]],["Karachuonyo",["West Karachuonyo","North Karachuonyo","Central","Kanyaluo","Kibiri","Wangchieng","Kendu Bay Town"]],["Rangwe",["West Gem","East Gem","Kagan","Kochia"]],["Homa Bay Town",["Homa Bay Central","Homa Bay Arujo","Homa Bay West","Homa Bay East"]],["Ndhiwa",["Kwabwai","Kanyadoto","Kanyikela","North Kabuoch","Kabuoch South/Pala","Kanyamwa Kologi","Kanyamwa Kosewe"]],["Mbita",["Mfangano Island","Rusinga Island","Kasgunga","Gembe","Lambwe"]],["Suba",["Gwassi South","Gwassi North","Kaksingri West","Ruma Kaksingri East"]]]],
  [44,"Migori",[["Rongo",["North Kamagambo","Central Kamagambo","East Kamagambo","South Kamagambo"]],["Awendo",["North Sakwa","South Sakwa","West Sakwa","Central Sakwa"]],["Suna East",["God Jope","Suna Central","Kakrao","Kwa"]],["Suna West",["Wiga","Wasweta Ii","Ragana-Oruba","Wasimbete"]],["Uriri",["West Kanyamkago","North Kanyamkago","Central Kanyamkago","South Kanyamkago","East Kanyamkago"]],["Nyatike",["Kachien'g","Kanyasa","North Kadem","Macalder/Kanyarwanda","Kaler","Got Kachola","Muhuru"]],["Kuria West",["Bukira East","Bukira Centrl/Ikerege","Isibania","Makerero","Masaba","Tagare","Nyamosense/Komosoko"]],["Kuria East",["Gokeharaka/Getambwega","Ntimaru West","Ntimaru East","Nyabasi East","Nyabasi West"]]]],
  [45,"Kisii",[["Bonchari",["Bomariba","Bogiakumu","Bomorenda","Riana"]],["South Mugirango",["Tabaka","Boikang'a","Bogetenga","Borabu/Chitago","Moticho","Getenga"]],["Bomachoge Borabu",["Bombaba Borabu","Boochi Borabu","Bokimonge","Magenche"]],["Bobasi",["Masige West","Masige East","Bobasi Central","Nyacheki","Bobasi Bogetaorio","Bobasi Chache","Sameta/Mokwerero","Bobasi Boitangare"]],["Bomachoge Chache",["Majoge","Boochi/Tendere","Bosoti/Sengera"]],["Nyaribari Masaba",["Ichuni","Nyamasibi","Masimba","Gesusu","Kiamokama"]],["Nyaribari Chache",["Bobaracho","Kisii Central","Keumbu","Kiogoro","Birongo","Ibeno"]],["Kitutu Chache North",["Monyerero","Sensi","Marani","Kegogi"]],["Kitutu Chache South",["Bogusero","Bogeka","Nyakoe","Kitutu Central","Nyatieko"]]]],
  [46,"Nyamira",[["Kitutu Masaba",["Rigoma","Gachuba","Kemera","Magombo","Manga","Gesima"]],["West Mugirango",["Nyamaiya","Bogichora","Bosamaro","Bonyamatuta","Township"]],["North Mugirango",["Itibo","Bomwagamo","Bokeira","Magwagwa","Ekerenyo"]],["Borabu",["Mekenene","Kiabonyoru","Nyansiongo","Esise"]]]],
  [47,"Nairobi",[["Westlands",["Kitisuru","Parklands/Highridge","Karura","Kangemi","Mountain View"]],["Dagoretti North",["Kilimani","Kawangware","Gatina","Kileleshwa","Kabiro"]],["Dagoretti South",["Mutuini","Ngando","Riruta","Uthiru/Ruthimitu","Waithaka"]],["Langata",["Karen","Nairobi West","Mugumo-Ini","South-C","Nyayo Highrise"]],["Kibra",["Laini Saba","Lindi","Makina","Woodley/Kenyatta Golf","Sarangombe"]],["Roysambu",["Githurai","Kahawa West","Zimmerman","Roysambu","Kahawa"]],["Kasarani",["Claycity","Mwiki","Kasarani","Njiru","Ruai"]],["Ruaraka",["Baba Dogo","Utalii","Mathare North","Lucky Summer","Korogocho"]],["Embakasi South",["Imara Daima","Kwa Njenga","Kwa Reuben","Pipeline","Kware"]],["Embakasi North",["Kariobangi North","Dandora Area I","Dandora Area Ii","Dandora Area Iii","Dandora Area Iv"]],["Embakasi Central",["Kayole North","Kayole Central","Kayole South","Komarock","Matopeni"]],["Embakasi East",["Upper Savannah","Lower Savannah","Embakasi","Utawala","Mihango"]],["Embakasi West",["Umoja I","Umoja Ii","Mowlem","Kariobangi South"]],["Makadara",["Makongeni","Maringo/Hamza","Harambee","Viwandani"]],["Kamukunji",["Pumwani","Eastleigh North","Eastleigh South","Airbase","California"]],["Starehe",["Nairobi Central","Ngara","Ziwani/Kariokor","Pangani","Landimawe","Nairobi South"]],["Mathare",["Hospital","Mabatini","Huruma","Ngei","Mlango Kubwa","Kiamaiko"]]]],
];

export type KenyaConstituency = { name: string; wards: string[] };
export type KenyaCounty = { code: number; name: string; constituencies: KenyaConstituency[] };

export const kenyaCounties: KenyaCounty[] = RAW.map(([code, name, constituencies]) => ({
  code,
  name,
  constituencies: constituencies.map(([constituencyName, wards]) => ({ name: constituencyName, wards })),
}));

const fold = (value: string) => value.trim().toLowerCase();

export function findKenyaCounty(name: string): KenyaCounty | undefined {
  const wanted = fold(name);
  return wanted ? kenyaCounties.find((county) => fold(county.name) === wanted) : undefined;
}

export function findKenyaConstituency(countyName: string, name: string): KenyaConstituency | undefined {
  const wanted = fold(name);
  return wanted
    ? findKenyaCounty(countyName)?.constituencies.find((item) => fold(item.name) === wanted)
    : undefined;
}

export type KenyaPlaceSelection = { county?: string; constituency?: string; ward?: string };

/**
 * Keep only a selection that exists: an unknown county clears everything, an
 * unknown constituency clears the ward. Returns the official spellings.
 */
export function normalizeKenyaPlace(selection: KenyaPlaceSelection): KenyaPlaceSelection {
  const county = findKenyaCounty(selection.county ?? '');
  if (!county) return {};
  const constituency = findKenyaConstituency(county.name, selection.constituency ?? '');
  if (!constituency) return { county: county.name };
  const wanted = fold(selection.ward ?? '');
  const ward = wanted ? constituency.wards.find((item) => fold(item) === wanted) : undefined;
  return { county: county.name, constituency: constituency.name, ...(ward ? { ward } : {}) };
}

/** "Port Reitz, Changamwe, Mombasa": the most specific part first. */
export function kenyaPlaceLabel(selection: KenyaPlaceSelection): string {
  return [selection.ward, selection.constituency, selection.county].filter(Boolean).join(', ');
}

/** True when `text` contains `name` as whole words (case-insensitive). */
export function textNamesPlace(text: string, name: string): boolean {
  const wanted = fold(name);
  if (!wanted) return false;
  const haystack = fold(text);
  let from = 0;
  for (;;) {
    const at = haystack.indexOf(wanted, from);
    if (at < 0) return false;
    const before = at === 0 ? '' : haystack.charAt(at - 1);
    const after = haystack.charAt(at + wanted.length);
    const isWordChar = (char: string) => /[a-z0-9]/.test(char);
    if (!isWordChar(before) && !isWordChar(after)) return true;
    from = at + 1;
  }
}

/**
 * True when free text (an advert title, description or address) names the most
 * specific place selected. Narrows results by area until listings carry a
 * structured location. No selection matches everything. Many wards have
 * everyday names ("Township", "Hospital", "Market"), so a ward only counts
 * when its constituency or county is named too.
 */
export function textMentionsKenyaPlace(text: string, selection: KenyaPlaceSelection): boolean {
  const place = normalizeKenyaPlace(selection);
  if (!place.county) return true;
  if (place.ward && place.constituency) {
    return (
      textNamesPlace(text, place.ward) &&
      (fold(place.ward) === fold(place.constituency) ||
        textNamesPlace(text, place.constituency) ||
        textNamesPlace(text, place.county))
    );
  }
  return textNamesPlace(text, place.constituency ?? place.county);
}
