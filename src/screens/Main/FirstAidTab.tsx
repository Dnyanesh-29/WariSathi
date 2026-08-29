import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Image } from 'react-native';
import { Text } from '../../components/CustomText';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '../../theme/colors';
import { useLang } from '../../context/LangContext';
import { Feather } from '@expo/vector-icons';

// Bundled offline images — never load from internet
const TOPIC_IMAGES: Record<string, any> = {
  heatstroke: require('../../../assets/firstaid/heatstroke.jpg'),
  dehydration: require('../../../assets/firstaid/dehydration.jpg'),
  foot: require('../../../assets/firstaid/foot.jpg'),
  diarrhea: require('../../../assets/firstaid/diarrhea.jpg'),
  accident: require('../../../assets/firstaid/accident.jpg'),
  snake: require('../../../assets/firstaid/snakebite.jpg'),
};

const AID_DATA = {
  en: [
    {
      id: 'heatstroke', icon: 'sun', name: 'Heatstroke', color: '#E74C3C',
      intro: 'Immediate action steps for heat emergency. Act within minutes.',
      steps: [
        { icon: 'wind', text: 'Move to a cool, shaded area immediately', image: require('../../../assets/firstaid/steps/shade.jpg') },
        { icon: 'info', text: 'Remove excess clothing to help the body cool' },
        { icon: 'activity', text: 'Fan the person and apply cool water to skin' },
        { icon: 'droplet', text: 'Give sips of cool water if they are conscious' },
        { icon: 'thermometer', text: 'Place ice packs under armpits, neck, and groin' },
        { icon: 'plus-square', text: 'Seek medical help immediately — call the camp' },
      ],
      donts: ['Do NOT give alcohol', 'Do NOT leave them alone', 'Do NOT give fluids if unconscious'],
    },
    {
      id: 'dehydration', icon: 'droplet', name: 'Dehydration', color: '#3498DB',
      intro: 'Signs: dry mouth, dizziness, dark urine. Act quickly.',
      steps: [
        { icon: 'wind', text: 'Find shade and make the person lie down' },
        { icon: 'plus-square', text: 'Give ORS (Oral Rehydration Salts) if available', image: require('../../../assets/firstaid/steps/ors.jpg') },
        { icon: 'droplet', text: 'Offer small sips of clean water every 5 minutes' },
        { icon: 'thermometer', text: 'Apply a damp cloth to the forehead', image: require('../../../assets/firstaid/steps/cloth.jpg') },
        { icon: 'alert-circle', text: 'Rush to medical camp if no urination for 8+ hours' },
      ],
      donts: ['Do NOT give large amounts of water at once', 'Do NOT give sugary drinks like cola'],
    },
    {
      id: 'foot', icon: 'activity', name: 'Foot Injury / Blisters', color: '#F39C12',
      intro: 'Very common in Wari. Quick care prevents infection.',
      steps: [
        { icon: 'pause-circle', text: 'Stop walking and find a clean flat place to sit' },
        { icon: 'info', text: 'Remove footwear gently without tearing skin' },
        { icon: 'droplet', text: 'Clean the area with water or antiseptic wipe' },
        { icon: 'plus-square', text: 'For blisters: do NOT pop. Cover with a clean bandage', image: require('../../../assets/firstaid/steps/bandage.jpg') },
        { icon: 'thermometer', text: 'For sprains: rest, elevate, and apply cold compress' },
      ],
      donts: ['Do NOT pop blisters with dirty needles', 'Do NOT walk barefoot on dusty roads'],
    },
    {
      id: 'diarrhea', icon: 'frown', name: 'Diarrhea / Stomach Upset', color: '#9B59B6',
      intro: 'Prevent dehydration first. Rest and rehydrate.',
      steps: [
        { icon: 'x-circle', text: 'Stop eating solid food for a few hours' },
        { icon: 'plus-square', text: 'Start ORS rehydration solution immediately' },
        { icon: 'moon', text: 'Rest in a comfortable position' },
        { icon: 'droplet', text: 'Only drink safe sealed or boiled water' },
        { icon: 'coffee', text: 'Eat bland foods (rice, banana) when ready', image: require('../../../assets/firstaid/steps/bland_food.jpg') },
      ],
      donts: ['Do NOT consume milk or oily foods', 'Do NOT take medicines without a doctor'],
    },
    {
      id: 'accident', icon: 'alert-triangle', name: 'Road Accident / Trauma', color: '#E74C3C',
      intro: 'Stay calm. Protect the victim and get help.',
      steps: [
        { icon: 'shield', text: 'Ensure your own safety first' },
        { icon: 'mic', text: 'Call loudly — send someone to find police or medical team' },
        { icon: 'slash', text: 'Do NOT move the person if neck/spine injury suspected' },
        { icon: 'crosshair', text: 'Stop bleeding by pressing a clean cloth firmly', image: require('../../../assets/firstaid/steps/pressure.jpg') },
        { icon: 'thermometer', text: 'Keep the person warm and calm while waiting for help' },
      ],
      donts: ['Do NOT move a seriously injured person unless in immediate danger', 'Do NOT give food/water to unconscious person'],
    },
    {
      id: 'snake', icon: 'activity', name: 'Snake Bite', color: '#27AE60',
      intro: 'Keep calm — panic spreads venom. Get to camp FAST.',
      steps: [
        { icon: 'smile', text: 'Keep the person calm — anxiety increases venom spread' },
        { icon: 'minus', text: 'Immobilize the bitten limb, keep it below heart level', image: require('../../../assets/firstaid/steps/immobilize.jpg') },
        { icon: 'scissors', text: 'Remove rings, watches, or tight clothing near bite' },
        { icon: 'clock', text: 'Note the exact time of the bite for the doctor' },
        { icon: 'truck', text: 'Carry the person to a medical camp immediately' },
      ],
      donts: ['Do NOT cut or suck the venom', 'Do NOT tie a tight tourniquet', 'Do NOT give alcohol'],
    },
  ],
  mr: [
    {
      id: 'heatstroke', icon: 'sun', name: 'उष्माघात', color: '#E74C3C',
      intro: 'उष्माघाताच्या आणीबाणीसाठी तत्काळ कृती. काही मिनिटांत कार्य करा.',
      steps: [
        { icon: 'wind', text: 'त्वरित थंड, सावलीच्या ठिकाणी हलवा', image: require('../../../assets/firstaid/steps/shade.jpg') },
        { icon: 'info', text: 'शरीर थंड होण्यासाठी जास्तीचे कपडे काढा' },
        { icon: 'activity', text: 'हवा घाला आणि त्वचेवर थंड पाणी लावा' },
        { icon: 'droplet', text: 'शुद्धीत असल्यास थंड पाण्याचे घोट द्या' },
        { icon: 'thermometer', text: 'काखेत, मानेवर आणि मांडीत बर्फाच्या पिशव्या ठेवा' },
        { icon: 'plus-square', text: 'त्वरित वैद्यकीय मदत घ्या — शिबिरावर जा' },
      ],
      donts: ['दारू देऊ नका', 'त्यांना एकटे सोडू नका', 'बेशुद्ध असल्यास द्रव देऊ नका'],
    },
    {
      id: 'dehydration', icon: 'droplet', name: 'निर्जलीकरण', color: '#3498DB',
      intro: 'लक्षणे: कोरडे तोंड, चक्कर, गडद लघवी. त्वरित कार्य करा.',
      steps: [
        { icon: 'wind', text: 'सावली शोधा आणि व्यक्तीला झोपवा' },
        { icon: 'plus-square', text: 'ORS (तोंडावाटे पुनर्जलीकरण लवण) उपलब्ध असल्यास द्या', image: require('../../../assets/firstaid/steps/ors.jpg') },
        { icon: 'droplet', text: 'दर ५ मिनिटांनी स्वच्छ पाण्याचे छोटे घोट द्या' },
        { icon: 'thermometer', text: 'कपाळावर ओला कपडा लावा', image: require('../../../assets/firstaid/steps/cloth.jpg') },
        { icon: 'alert-circle', text: '८+ तास लघवी नसल्यास वैद्यकीय शिबिरात घाईने जा' },
      ],
      donts: ['एकाच वेळी जास्त पाणी देऊ नका', 'कोला सारखी साखरयुक्त पेये देऊ नका'],
    },
    {
      id: 'foot', icon: 'activity', name: 'पाय दुखापत / फोड', color: '#F39C12',
      intro: 'वारीत खूप सामान्य. जलद काळजी संसर्ग प्रतिबंधित करते.',
      steps: [
        { icon: 'pause-circle', text: 'चालणे थांबवा आणि स्वच्छ सपाट जागा शोधा' },
        { icon: 'info', text: 'त्वचा न तोडता हळूवारपणे पादत्राणे काढा' },
        { icon: 'droplet', text: 'पाणी किंवा जंतुनाशक वाइपने क्षेत्र स्वच्छ करा' },
        { icon: 'plus-square', text: 'फोडांसाठी: उघडू नका. स्वच्छ पट्टीने झाका', image: require('../../../assets/firstaid/steps/bandage.jpg') },
        { icon: 'thermometer', text: 'मोचासाठी: विश्रांती घ्या, वर करा, थंड पट्टी लावा' },
      ],
      donts: ['घाणेरड्या सुयांनी फोड उघडू नका', 'धुळेरी रस्त्यांवर अनवाणी चालू नका'],
    },
    {
      id: 'diarrhea', icon: 'frown', name: 'अतिसार / पोट खराब', color: '#9B59B6',
      intro: 'प्रथम निर्जलीकरण प्रतिबंधित करा. विश्रांती आणि पुनर्जलीकरण.',
      steps: [
        { icon: 'x-circle', text: 'काही तास घन अन्न खाणे थांबवा' },
        { icon: 'plus-square', text: 'ORS पुनर्जलीकरण द्रावण त्वरित सुरू करा' },
        { icon: 'moon', text: 'आरामदायक स्थितीत विश्रांती घ्या' },
        { icon: 'droplet', text: 'फक्त सुरक्षित बंद किंवा उकळलेले पाणी प्या' },
        { icon: 'coffee', text: 'तयार झाल्यावर साधे अन्न (भात, केळी) खा', image: require('../../../assets/firstaid/steps/bland_food.jpg') },
      ],
      donts: ['दूध किंवा तेलकट अन्न खाऊ नका', 'डॉक्टरांशिवाय औषधे घेऊ नका'],
    },
    {
      id: 'accident', icon: 'alert-triangle', name: 'अपघात / दुखापत', color: '#E74C3C',
      intro: 'शांत राहा. पीडिताचे संरक्षण करा आणि मदत मिळवा.',
      steps: [
        { icon: 'shield', text: 'प्रथम स्वतःची सुरक्षितता सुनिश्चित करा' },
        { icon: 'mic', text: 'मोठ्याने बोलवा — पोलिस किंवा वैद्यकीय पथकाला पाठवा' },
        { icon: 'slash', text: 'मान/मणक्याला दुखापत असल्यास हलवू नका' },
        { icon: 'crosshair', text: 'स्वच्छ कपड्याने दाबून रक्तस्राव थांबवा', image: require('../../../assets/firstaid/steps/pressure.jpg') },
        { icon: 'thermometer', text: 'मदतीची वाट पाहताना उबदार आणि शांत ठेवा' },
      ],
      donts: ['गंभीर दुखापत झालेल्या व्यक्तीला तात्काळ धोका नसल्यास हलवू नका', 'बेशुद्ध व्यक्तीला अन्न/पाणी देऊ नका'],
    },
    {
      id: 'snake', icon: 'activity', name: 'साप चावणे', color: '#27AE60',
      intro: 'शांत राहा — भीती विषाचा प्रसार वाढवते. शिबिरात त्वरित जा.',
      steps: [
        { icon: 'smile', text: 'व्यक्तीला शांत ठेवा — चिंता विषाचा प्रसार वाढवते' },
        { icon: 'minus', text: 'चावलेला अवयव हृदयाच्या खाली ठेवून स्थिर करा', image: require('../../../assets/firstaid/steps/immobilize.jpg') },
        { icon: 'scissors', text: 'चाव्याजवळ अंगठ्या, घड्याळे काढा' },
        { icon: 'clock', text: 'डॉक्टरांसाठी चाव्याची वेळ नोंदवा' },
        { icon: 'truck', text: 'व्यक्तीला त्वरित वैद्यकीय शिबिरात न्या' },
      ],
      donts: ['विष कापू किंवा चोखू नका', 'घट्ट टूर्निकेट बांधू नका', 'दारू देऊ नका'],
    },
  ],
};

export const FirstAidTab = () => {
  const insets = useSafeAreaInsets();
  const { lang } = useLang();
  const topics = AID_DATA[lang as 'en' | 'mr'] || AID_DATA.en;
  const [selected, setSelected] = useState<typeof topics[0] | null>(null);

  if (selected) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => setSelected(null)}>
          <Feather name="arrow-left" size={20} color={Colors.primary} />
          <Text style={styles.backText}>{lang === 'mr' ? 'परत' : 'Back'}</Text>
        </TouchableOpacity>
        <ScrollView contentContainerStyle={styles.detailScroll} showsVerticalScrollIndicator={false}>
          <View style={[styles.heroIconWrapper, { backgroundColor: selected.color + '20' }]}>
            <Feather name={selected.icon as any} size={48} color={selected.color} />
          </View>
          <Text style={styles.detailTitle}>{selected.name}</Text>
          {TOPIC_IMAGES[selected.id] && (
            <Image
              source={TOPIC_IMAGES[selected.id]}
              style={styles.heroImage}
              resizeMode="cover"
            />
          )}
          <View style={[styles.introCard, { borderLeftColor: selected.color }]}>
            <Text style={styles.introText}>{selected.intro}</Text>
          </View>
          <Text style={styles.sectionLabel}>
            <Feather name="check-circle" size={16} color={selected.color} style={{ marginRight: 6 }} />
            {lang === 'mr' ? 'पाळण्याच्या पायऱ्या:' : 'Steps to Follow:'}
          </Text>
          {selected.steps.map((step, i) => (
            <View key={i} style={styles.stepRow}>
              <View style={[styles.stepNumBadge, { backgroundColor: selected.color }]}>
                <Text style={styles.stepNum}>{i + 1}</Text>
              </View>
              <View style={styles.stepVisual}>
                <Feather name={step.icon as any} size={24} color={selected.color} />
              </View>
              <View style={styles.stepContent}>
                <Text style={styles.stepText}>{step.text}</Text>
                {(step as any).image && (
                  <Image source={(step as any).image} style={styles.stepImage} resizeMode="cover" />
                )}
              </View>
            </View>
          ))}
          <View style={styles.dontsBox}>
            <Text style={styles.dontsTitle}>
              <Feather name="x-circle" size={14} color="#C0392B" style={{ marginRight: 4 }} />
              {lang === 'mr' ? 'करू नका:' : "DON'Ts:"}
            </Text>
            {selected.donts.map((d, i) => (
              <Text key={i} style={styles.dontItem}>• {d}</Text>
            ))}
          </View>
          <TouchableOpacity style={styles.campBtn}>
            <Feather name="map-pin" size={18} color="#FFF" style={{ marginRight: 8 }} />
            <Text style={styles.campBtnText}>
              {lang === 'mr' ? 'जवळचे वैद्यकीय शिबिर शोधा' : 'Find Nearest Medical Camp'}
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.headerBar}>
        <Text style={styles.headerTitle}>
          {lang === 'mr' ? 'ऑफलाइन प्रथमोपचार साथी' : 'Offline First Aid Companion'}
        </Text>
        <Text style={styles.headerSub}>
          {lang === 'mr' ? '३ भाषा • चरण-दर-चरण • ऑफलाइन कार्य करते' : '3 Languages • Step-by-Step • Works Offline'}
        </Text>
      </View>
      <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
        {topics.map(topic => (
          <TouchableOpacity key={topic.id} style={styles.topicCard} onPress={() => setSelected(topic)}>
            <View style={[styles.topicIcon, { backgroundColor: topic.color + '15' }]}>
              <Feather name={topic.icon as any} size={28} color={topic.color} />
            </View>
            <View style={styles.topicInfo}>
              <Text style={styles.topicName}>{topic.name}</Text>
              <Text style={styles.topicSub}>{topic.steps.length} {lang === 'mr' ? 'पायऱ्या' : 'steps'} • {lang === 'mr' ? 'वाचण्यासाठी दाबा' : 'Tap to read'}</Text>
            </View>
            <Feather name="chevron-right" size={24} color={Colors.inactive} />
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  headerBar: { backgroundColor: Colors.surface, padding: 20, borderBottomWidth: 1, borderBottomColor: Colors.border, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 5, elevation: 3 },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: Colors.textPrimary },
  headerSub: { fontSize: 13, color: Colors.textSecondary, marginTop: 4 },
  list: { padding: 16, paddingBottom: 40 },
  topicCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface, borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: Colors.border, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 2 },
  topicIcon: { width: 60, height: 60, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginRight: 16 },
  topicInfo: { flex: 1 },
  topicName: { fontSize: 16, fontWeight: 'bold', color: Colors.textPrimary, marginBottom: 4 },
  topicSub: { fontSize: 13, color: Colors.textSecondary },

  // Detail view
  backBtn: { padding: 16, backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.border, flexDirection: 'row', alignItems: 'center' },
  backText: { fontSize: 16, color: Colors.primary, fontWeight: '600', marginLeft: 8 },
  detailScroll: { padding: 20, paddingBottom: 40 },
  heroIconWrapper: { width: 100, height: 100, borderRadius: 50, justifyContent: 'center', alignItems: 'center', alignSelf: 'center', marginTop: 10 },
  detailTitle: { fontSize: 24, fontWeight: 'bold', color: Colors.textPrimary, textAlign: 'center', marginVertical: 16 },
  heroImage: { width: '100%', height: 220, borderRadius: 16, marginBottom: 20, backgroundColor: '#F0F0F0' },
  introCard: { backgroundColor: '#F8F9FA', borderLeftWidth: 5, borderRadius: 12, padding: 16, marginBottom: 24, shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 4, elevation: 1 },
  introText: { fontSize: 15, color: Colors.textPrimary, lineHeight: 22 },
  sectionLabel: { fontSize: 16, fontWeight: 'bold', color: Colors.textPrimary, marginBottom: 16, flexDirection: 'row', alignItems: 'center' },
  stepRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface, borderRadius: 12, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: Colors.border, shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 4, elevation: 1 },
  stepNumBadge: { width: 28, height: 28, borderRadius: 14, justifyContent: 'center', alignItems: 'center', marginRight: 12, flexShrink: 0 },
  stepNum: { color: '#FFF', fontWeight: 'bold', fontSize: 13 },
  stepVisual: { width: 44, justifyContent: 'center', alignItems: 'center', marginRight: 12, flexShrink: 0 },
  stepContent: { flex: 1 },
  stepText: { fontSize: 14, color: Colors.textPrimary, lineHeight: 21 },
  stepImage: { width: '100%', height: 140, borderRadius: 10, marginTop: 12 },
  dontsBox: { backgroundColor: '#FDEDEC', borderRadius: 12, padding: 16, marginTop: 12, marginBottom: 24, borderWidth: 1, borderColor: '#FADBD8' },
  dontsTitle: { fontSize: 15, fontWeight: 'bold', color: '#C0392B', marginBottom: 12, flexDirection: 'row', alignItems: 'center' },
  dontItem: { fontSize: 14, color: '#922B21', lineHeight: 24 },
  campBtn: { backgroundColor: Colors.primary, padding: 18, borderRadius: 14, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', shadowColor: Colors.primary, shadowOpacity: 0.3, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 4 },
  campBtnText: { color: '#FFF', fontWeight: 'bold', fontSize: 16 },
});
